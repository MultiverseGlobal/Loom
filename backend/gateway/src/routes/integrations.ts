import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { integrationService } from '../services/integrationService.js';
import { requireAuth } from '../middleware/supabase-auth.js';
import { z } from 'zod';
import { GithubService } from '../services/githubService.js';

export async function registerIntegrationsRoutes(server: FastifyInstance) {

    // List all user's integrations
    server.get('/integrations', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const integrations = await integrationService.getUserIntegrations(userId);

        // Hide sensitive token data
        const sanitized = integrations.map(i => ({
            id: i.id,
            provider: i.provider,
            provider_account_id: i.provider_account_id,
            scope: i.scope,
            metadata: i.metadata,
            connected_at: i.connected_at,
            last_synced_at: i.last_synced_at,
            has_token: !!i.access_token
        }));

        return { integrations: sanitized };
    });

    // Get integration status for a specific provider
    server.get('/integrations/:provider/status', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { provider } = req.params as { provider: string };

        const integration = await integrationService.getUserIntegrationByProvider(userId, provider);

        return {
            connected: !!integration,
            integration: integration ? {
                id: integration.id,
                provider: integration.provider,
                connected_at: integration.connected_at,
                last_synced_at: integration.last_synced_at
            } : null
        };
    });

    // Get resources for an integration (repos, workspaces, etc.)
    server.get('/integrations/:id/resources', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        const { page = '1' } = req.query as { page?: string };

        const integration = await integrationService.getIntegration(id, userId);
        if (!integration) {
            return reply.status(404).send({ error: 'Integration not found' });
        }

        try {
            let resources: any[] = [];

            // Provider-specific resource fetching
            if (integration.provider === 'github') {
                const githubService = new GithubService(integration.access_token);
                const repos = await githubService.getUserRepos(parseInt(page));
                resources = repos.map(repo => ({
                    type: 'repository',
                    id: repo.full_name,
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    private: repo.private,
                    url: repo.html_url,
                    updated_at: repo.updated_at
                }));
            } else if (integration.provider === 'figma') {
                // TODO: Implement Figma workspace listing
                resources = [];
            } else if (integration.provider === 'linear') {
                // TODO: Implement Linear workspace listing
                resources = [];
            } else if (integration.provider === 'notion') {
                // TODO: Implement Notion workspace listing
                resources = [];
            }

            return { resources };
        } catch (error: any) {
            req.log.error({ error, integrationId: id }, 'Failed to fetch integration resources');
            return reply.status(500).send({
                error: 'Failed to fetch resources',
                message: error.message
            });
        }
    });

    // Delete an integration
    server.delete('/integrations/:id', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { id } = req.params as { id: string };

        const deleted = await integrationService.deleteIntegration(id, userId);
        if (!deleted) {
            return reply.status(404).send({ error: 'Integration not found' });
        }

        return { success: true };
    });

    // Link integration to project
    server.post('/projects/:projectId/integrations', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { projectId } = req.params as { projectId: string };

        const body = z.object({
            integration_id: z.string().uuid(),
            resource_type: z.string(),
            resource_id: z.string(),
            resource_name: z.string(),
            sync_enabled: z.boolean().optional(),
            sync_config: z.record(z.any()).optional()
        }).parse(req.body);

        // Verify integration belongs to user
        const integration = await integrationService.getIntegration(body.integration_id, userId);
        if (!integration) {
            return reply.status(404).send({ error: 'Integration not found' });
        }

        // Verify project belongs to user
        const { getProject } = await import('../services/projectService.js');
        const project = await getProject(projectId);
        if (!project || project.user_id !== userId) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const link = await integrationService.linkProjectToIntegration({
            project_id: projectId,
            integration_id: body.integration_id,
            resource_type: body.resource_type,
            resource_id: body.resource_id,
            resource_name: body.resource_name,
            sync_enabled: body.sync_enabled,
            sync_config: body.sync_config
        });

        return { success: true, link };
    });

    // Get project's integrations
    server.get('/projects/:projectId/integrations', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { projectId } = req.params as { projectId: string };

        // Verify project belongs to user
        const { getProject } = await import('../services/projectService.js');
        const project = await getProject(projectId);
        if (!project || project.user_id !== userId) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const integrations = await integrationService.getProjectIntegrations(projectId);
        return { integrations };
    });

    // Unlink integration from project
    server.delete('/projects/:projectId/integrations/:linkId', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = req.userId!;
        const { projectId, linkId } = req.params as { projectId: string; linkId: string };

        // Verify project belongs to user
        const { getProject } = await import('../services/projectService.js');
        const project = await getProject(projectId);
        if (!project || project.user_id !== userId) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        // Verify link belongs to project
        const link = await integrationService.getProjectIntegration(linkId);
        if (!link || link.project_id !== projectId) {
            return reply.status(404).send({ error: 'Integration link not found' });
        }

        const deleted = await integrationService.unlinkProjectIntegration(linkId);
        return { success: deleted };
    });
}
