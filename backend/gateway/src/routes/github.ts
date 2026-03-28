import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GithubService } from '../services/githubService.js';

import { integrationService } from '../services/integrationService.js';
import { requireAuth } from '../middleware/supabase-auth.js';
import { config } from '../config.js';
import { z } from 'zod';
import axios from 'axios';

export async function registerGithubRoutes(server: FastifyInstance) {

    // 1. Authorize: Redirect user to GitHub
    server.get('/github/authorize', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const clientId = config.githubClientId;
        if (!clientId) return reply.status(500).send({ error: "GitHub Client ID not configured" });

        const state = req.userId; // Use userId as state for simple validation
        const scope = 'repo,user:email';
        // Use the actual app URL for redirect
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
        const redirectUri = `${appUrl}/api/auth/github/callback`;

        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        return { url };
    });

    // 2. Callback: Exchange code for token (called by frontend proxy or direct)
    server.post('/github/callback', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { code } = z.object({ code: z.string() }).parse(req.body);
        const userId = req.userId!;

        try {
            // Exchange code for token
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
            // CRITICAL: Must exactly match the URI used in authorization (including protocol and no trailing slash)
            const redirectUri = `${appUrl}/api/auth/github/callback`;

            console.log('[GitHub Callback] Exchanging code for token:', {
                client_id: config.githubClientId,
                redirect_uri: redirectUri,
                code: code.substring(0, 5) + '...'
            });

            const exchangePayload = {
                client_id: config.githubClientId,
                client_secret: config.githubClientSecret,
                code,
                redirect_uri: redirectUri
            };

            console.log('[GitHub Callback] Sending exchange request to GitHub:', {
                ...exchangePayload,
                client_secret: '***' // Hide secret in logs
            });

            const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', exchangePayload, {
                headers: { Accept: 'application/json' }
            });

            console.log('[GitHub Callback] Token response:', tokenResponse.data);

            const { access_token, scope, error: ghError, error_description } = tokenResponse.data;
            if (ghError) {
                console.error('[GitHub Callback] GitHub Error:', ghError, error_description);
                throw new Error(`GitHub Error: ${ghError} - ${error_description}`);
            }
            if (!access_token) throw new Error("Failed to get access token from GitHub");

            // Get GitHub User Info
            const githubUserResponse = await axios.get('https://github.com/user', {
                headers: { Authorization: `token ${access_token}` }
            });

            const githubUser = githubUserResponse.data;

            // Save to integrations table (new system)
            const integration = await integrationService.saveIntegration({
                user_id: userId,
                provider: 'github',
                provider_account_id: String(githubUser.id),
                access_token,
                scope,
                metadata: {}
            });

            return { success: true, github_user: githubUser.login, integration_id: integration.id };
        } catch (error: any) {
            const errorData = error.response?.data;
            const errorMsg = errorData?.error_description || errorData?.error || error.message || "Unknown error";
            console.error('[GitHub Callback] Technical Error:', {
                message: error.message,
                status: error.response?.status,
                data: errorData
            });
            return reply.status(500).send({ 
                error: `OAuth exchange failed: ${errorMsg}`,
                details: errorData || error.message
            });
        }
    });

    // Connect GitHub Account (store token server-side)
    server.post('/github/connect', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const body = z.object({
            access_token: z.string(),
            github_user_id: z.string(),
            installation_id: z.string().optional(),
            scope: z.string().optional()
        }).parse(req.body);

        const integration = await integrationService.saveIntegration({
            user_id: userId,
            provider: 'github',
            provider_account_id: body.github_user_id,
            access_token: body.access_token,
            scope: body.scope,
            metadata: { installation_id: body.installation_id }
        });

        return { success: true, integration_id: integration.id };
    });

    // Bind Repository to Project
    server.post('/github/bind', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const body = z.object({
            project_id: z.string().uuid(),
            owner: z.string(),
            repo: z.string(),
            branch: z.string().optional(),
            installation_id: z.string().optional()
        }).parse(req.body);

        // Get GitHub integration ID
        const userId = req.userId!;
        const integration = await integrationService.getUserIntegrationByProvider(userId, 'github');
        if (!integration) {
            return reply.status(400).send({ error: "No GitHub integration found" });
        }

        const link = await integrationService.linkProjectToIntegration({
            project_id: body.project_id,
            integration_id: integration.id,
            resource_type: 'repository',
            resource_id: `${body.owner}/${body.repo}`,
            resource_name: body.repo,
            sync_config: {
                branch: body.branch || 'main',
                installation_id: body.installation_id
            }
        });

        return { success: true, link_id: link.id };
    });

    // Get Repo Tree (uses stored token)
    server.get('/github/tree/:owner/:repo', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { owner, repo } = req.params as { owner: string, repo: string };

        const integration = await integrationService.getUserIntegrationByProvider(userId, 'github');
        if (!integration) {
            return reply.status(401).send({ error: "GitHub account not connected" });
        }

        try {
            const svc = new GithubService(integration.access_token);
            const tree = await svc.getRepoTree(owner, repo);
            return { tree };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });
    });
    
    // Check connection status
    server.get('/github/status', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const integration = await integrationService.getUserIntegrationByProvider(userId, 'github');
        
        if (!integration) {
            return { connected: false };
        }
        
        return { 
            connected: true, 
            username: integration.metadata?.github_login || 'Connected User',
            connected_at: integration.connected_at
        };
    });
}
