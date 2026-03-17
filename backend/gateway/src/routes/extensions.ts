import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { extensionService } from "../services/extensionService.js";
import { db } from "../db/client.js";
import { requireAuth } from '../middleware/supabase-auth.js';
import { requireApiKey } from "../middleware/key-auth.js";
import * as commandService from "../services/commandService.js";

const machineInfoSchema = z.object({
    os: z.string(),
    ide: z.string(),
    version: z.string().optional(),
});

const analysisSchema = z.object({
    project_id: z.string(), // Removed .uuid() because deviceId might be simpler string
    name: z.string().optional(),
    summary: z.object({
        framework: z.string(),
        components: z.number(),
        dependencies: z.number(),
    }),
    issues: z.array(z.string()),
});

export async function registerExtensionRoutes(app: FastifyInstance) {

    /**
     * WEB UI: Generate a pairing code
     */
    app.get("/pairing-code", { preHandler: [requireAuth] }, async (request) => {
        const userId = (request as any).userId;
        const code = await extensionService.generatePairingCode(userId);
        return { code };
    });

    /**
     * WEB UI: Get all devices for the current user
     */
    app.get("/devices", { preHandler: [requireAuth] }, async (request) => {
        const userId = (request as any).userId;
        try {
            return await commandService.getUserDevices(userId);
        } catch (error) {
            if (process.env.LOCAL_MODE === 'true') {
                console.warn('[Devices] Failed to fetch (Local Mode Fallback):', error);
                return [];
            }
            throw error;
        }
    });

    /**
     * EXTENSION: Exchange code for token
     */
    app.post("/register", async (request, reply) => {
        const body = z.object({
            pairing_code: z.string(),
            machine_info: machineInfoSchema
        }).parse(request.body);

        const result = await extensionService.exchangePairingCode(body.pairing_code, body.machine_info);
        if (!result) {
            return reply.code(400).send({ error: "Invalid or expired pairing code" });
        }

        return {
            extension_token: result.token,
            user_id: result.user_id
        };
    });

    /**
     * EXTENSION: Poll for jobs
     */
    app.get("/jobs", { preHandler: [requireApiKey] }, async (request) => {
        const userId = (request as any).userId;
        const extensionId = (request as any).extensionId;
        const deviceId = request.headers['x-device-id'] as string;

        try {
            // Heartbeat logic
            const effectiveId = extensionId || deviceId;
            if (effectiveId && userId) {
                // Resurrection logic: Restore deleted rows using the token from auth header
                const authHeader = request.headers.authorization;
                // requireApiKey ensures this exists
                const rawKey = authHeader!.substring(7);
                const tokenHash = createHash("sha256").update(rawKey).digest("hex");

                // Use direct DB client to ensure consistency with commandService
                try {
                    await db`
                        INSERT INTO extensions (id, user_id, last_seen, token)
                        VALUES (${effectiveId}, ${userId}, NOW(), ${tokenHash})
                        ON CONFLICT (id) DO UPDATE SET last_seen = NOW()
                    `;
                } catch (e) {
                    // Suppress heartbeat errors in local mode if DB is down
                    if (process.env.LOCAL_MODE !== 'true') throw e;
                }
            }

            if (!effectiveId) return { jobs: [] };

            const commands = await commandService.pollCommands(effectiveId);

            // Map commands to user's "Jobs" concept
            return {
                jobs: commands.map(c => ({
                    job_id: c.id,
                    type: c.command_type,
                    payload: c.payload
                }))
            };
        } catch (error) {
            if (process.env.LOCAL_MODE === 'true') {
                // Quietly return empty jobs so extension doesn't crash
                return { jobs: [] };
            }
            throw error;
        }
    });

    /**
     * EXTENSION: Update job status
     */
    app.post("/jobs/:id/status", { preHandler: [requireApiKey] }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const body = z.object({
            status: z.enum(["IN_PROGRESS", "COMPLETED", "FAILED"]),
            message: z.string().optional(),
            metadata: z.record(z.any()).optional()
        }).parse(request.body);

        const command = await commandService.getCommand(id);
        if (!command) return reply.code(404).send({ error: "Job not found" });

        if (body.status === "COMPLETED") {
            await commandService.completeCommand(id, { message: body.message, ...body.metadata });
        } else if (body.status === "FAILED") {
            await commandService.failCommand(id, body.message || "Unknown error");
        } else {
            await commandService.startCommand(id); // Using startCommand for IN_PROGRESS
        }

        return { success: true };
    });

    /**
     * EXTENSION: Send analysis metadata
     */
    app.post("/analysis", { preHandler: [requireApiKey] }, async (request) => {
        const body = analysisSchema.parse(request.body);
        const userId = (request as any).userId;
        const extensionId = (request as any).extensionId;
        const deviceId = request.headers['x-device-id'] as string;
        const effectiveId = extensionId || deviceId;

        // Log the analysis activity
        console.log(`Received analysis for project ${body.name || body.project_id} from user ${userId} (device: ${effectiveId})`);

        // Update or Create the extension record
        if (effectiveId) {
            await db`
                INSERT INTO extensions (id, user_id, last_seen)
                VALUES (${effectiveId}, ${userId}, NOW())
                ON CONFLICT (id) DO UPDATE SET last_seen = NOW()
            `;
        }

        // Update or Create a project record for this IDE connection
        if (body.name) {
            const { data: project } = await supabase
                .from('projects')
                .select('id')
                .eq('user_id', userId)
                .eq('name', body.name)
                .maybeSingle();

            if (project) {
                await supabase
                    .from('projects')
                    .update({
                        framework: body.summary.framework,
                        status: 'ready',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', project.id);
            } else {
                await supabase
                    .from('projects')
                    .insert({
                        id: randomUUID(),
                        user_id: userId,
                        name: body.name,
                        framework: body.summary.framework,
                        status: 'ready',
                        source_platform: 'loom-ext',
                    });
            }
        }

        return { success: true };
    });

    /**
     * EXTENSION: Initialize device flow
     */
    app.post("/device-flow/init", async (request, reply) => {
        try {
            const body = z.object({
                device_id: z.string(),
                machine_info: machineInfoSchema
            }).parse(request.body);

            console.log('Device flow init request:', { device_id: body.device_id, machine_info: body.machine_info });

            const result = await extensionService.initDeviceFlow(body.device_id, body.machine_info);

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const verificationUri = `${baseUrl}/onboarding/connect?token=${result.pairing_id}`;

            return {
                pairing_id: result.pairing_id,
                expires_in: result.expires_in,
                verification_uri_complete: verificationUri
            };
        } catch (error: any) {
            console.error('❌ Device flow init error:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                details: error.details || error.hint || error.code
            });
            return reply.code(500).send({
                error: 'Device flow initialization failed',
                message: error.message,
                details: error.details || error.hint || 'Check server logs for more info'
            });
        }
    });

    /**
     * EXTENSION: Authorize device (called by Frontend)
     */
    app.post("/device-flow/authorize", { preHandler: [requireAuth] }, async (request, reply) => {
        const body = z.object({
            pairing_id: z.string()
        }).parse(request.body);

        const userId = (request as any).userId;

        try {
            await extensionService.authorizeDeviceSession(body.pairing_id, userId);
            return { success: true };
        } catch (error: any) {
            request.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    /**
     * EXTENSION: Poll for device flow status
     */
    app.get("/device-flow/poll", async (request) => {
        const { pairing_id } = z.object({ pairing_id: z.string() }).parse(request.query);
        const result = await extensionService.pollDeviceFlow(pairing_id);
        return result;
    });

    /**
     * EXTENSION: Validate API key (Stripe-style connection)
     * No auth required - this IS the auth check
     */
    app.post("/validate", async (request, reply) => {
        try {
            const body = z.object({
                api_key: z.string().startsWith('loom_')
            }).parse(request.body);

            const apiKey = body.api_key;

            // Hash the provided key
            const keyHash = createHash('sha256').update(apiKey).digest('hex');

            // Check if key exists and get user info
            const { data: keyRecord, error } = await supabase
                .from('api_keys')
                .select('id, user_id, name')
                .eq('key_hash', keyHash)
                .single();

            if (error || !keyRecord) {
                return reply.code(401).send({
                    valid: false,
                    error: 'Invalid API key'
                });
            }

            // Update last_used timestamp
            await supabase
                .from('api_keys')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', keyRecord.id);

            return {
                valid: true,
                user_id: keyRecord.user_id,
                key_name: keyRecord.name
            };
        } catch (error: any) {
            console.error('❌ API key validation error:', error);
            return reply.code(400).send({
                valid: false,
                error: 'Invalid request format'
            });
        }
    });


    /**
     * EXTENSION: Self-disconnect
     */
    app.post("/disconnect", { preHandler: [requireApiKey] }, async (request, reply) => {
        const extensionId = (request as any).extensionId;
        const userId = (request as any).userId;

        if (!extensionId) {
            return reply.code(400).send({ error: "No extension session found to disconnect" });
        }

        try {
            await extensionService.deleteExtension(extensionId, userId);
            return { success: true };
        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * WEB UI: Delete extension (Disconnect)
     */
    app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const userId = (request as any).userId;

        request.log.info({ extensionId: id, userId }, "[Extensions] Attempting to delete extension");

        try {
            await extensionService.deleteExtension(id, userId);
            request.log.info({ extensionId: id, userId }, "[Extensions] Successfully deleted extension");
            return { success: true };
        } catch (error: any) {
            request.log.error({ extensionId: id, userId, error: error.message }, "[Extensions] Failed to delete extension");
            return reply.code(500).send({ error: error.message });
        }
    });
}
