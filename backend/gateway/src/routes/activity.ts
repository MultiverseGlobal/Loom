import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../db/client.js";
import { requireAuth } from '../middleware/supabase-auth.js';

export async function registerActivityRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    typedApp.get("/activity", {
        schema: {
            querystring: z.object({
                limit: z.number().optional().default(10)
            })
        },
        preHandler: [requireAuth]
    }, async (request) => {
        const { limit } = request.query;

        let logs: any[] = [];
        try {
            logs = await db`
                SELECT id, action, metadata, created_at
                FROM activity_logs
                WHERE user_id = ${request.userId}
                ORDER BY created_at DESC
                LIMIT ${limit}
            `;
        } catch (error) {
            if (process.env.LOCAL_MODE !== 'true') throw error;
            console.warn('[Activity] Failed to fetch logs (Local Mode Fallback):', error);
        }

        return { logs };
    });
}
