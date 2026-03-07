
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/supabase-auth.js';

export async function registerBridgeRoutes(server: FastifyInstance) {
    server.post('/bridge/universal', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const schema = z.object({
            sourceUrl: z.string().url(),
            options: z.record(z.any()).optional()
        });

        const { sourceUrl, options = {} } = schema.parse(req.body);

        try {
            const { bridgeService } = await import('../services/bridgeService.js');
            const result = await bridgeService.bridgeFromSource({
                sourceUrl,
                options,
                userId: req.userId!
            });

            return {
                success: true,
                ...result
            };
        } catch (error: any) {
            console.error('[UniversalBridge] FAILED:', error);
            return reply.status(500).send({
                error: "Bridge failed",
                message: error.message
            });
        }
    });

    // Alias for the old Figma endpoint to maintain backward compatibility with v2.0.7 extension
    server.post('/figma/bridge', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { fileUrl, nodeId, token } = z.object({
            fileUrl: z.string().url(),
            nodeId: z.string().optional(),
            token: z.string().optional()
        }).parse(req.body);

        try {
            const { bridgeService } = await import('../services/bridgeService.js');
            const result = await bridgeService.bridgeFromSource({
                sourceUrl: fileUrl,
                options: { nodeId, token },
                userId: req.userId!
            });

            return {
                success: true,
                ...result
            };
        } catch (error: any) {
            console.error('[FigmaBridgeAlias] FAILED:', error);
            return reply.status(500).send({
                error: "Bridge failed",
                message: error.message
            });
        }
    });
}
