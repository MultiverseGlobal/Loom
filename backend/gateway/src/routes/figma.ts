import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { figmaService } from '../services/figmaService';
import { requireAuth } from '../middleware/supabase-auth';

export async function registerFigmaRoutes(server: FastifyInstance) {

    // Validate Figma Token
    server.post('/figma/validate-token', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { token } = z.object({ token: z.string() }).parse(req.body);

        const isValid = await figmaService.validateToken(token);

        if (!isValid) {
            return reply.status(401).send({ error: "Invalid Figma token" });
        }

        return { valid: true };
    });

    // Validate/Analyze File URL
    server.post('/figma/analyze', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { fileUrl, token } = z.object({
            fileUrl: z.string().url(),
            token: z.string()
        }).parse(req.body);

        const match = fileUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
        if (!match || !match[1]) {
            return reply.status(400).send({ error: "Invalid Figma file URL" });
        }

        const fileKey = match[1];
        const fileData = await figmaService.getFileHelper(fileKey, token);

        if (!fileData) {
            return reply.status(404).send({ error: "Figma file not found or access denied" });
        }

        return {
            success: true,
            name: fileData.name,
            last_modified: fileData.lastModified,
            thumbnail_url: fileData.thumbnailUrl
        };
    });

    // Extract Blueprint from Figma Node
    server.post('/figma/blueprint', { preHandler: [requireAuth] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { fileUrl, nodeId, token } = z.object({
            fileUrl: z.string().url(),
            nodeId: z.string(),
            token: z.string()
        }).parse(req.body);

        const match = fileUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
        if (!match || !match[1]) {
            return reply.status(400).send({ error: "Invalid Figma file URL" });
        }

        const fileKey = match[1];
        const blueprint = await figmaService.getBlueprint(fileKey, nodeId, token);

        if (!blueprint) {
            return reply.status(404).send({ error: "Figma node not found or conversion failed" });
        }

        return {
            success: true,
            blueprint
        };
    });
}
