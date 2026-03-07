import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../db/client.js";
import { requireAuth } from '../middleware/supabase-auth.js';

export async function registerSettingsRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    // Get user settings
    typedApp.get("/settings", {
        preHandler: [requireAuth]
    }, async (request) => {
        const [settings] = await db`
SELECT * FROM user_settings
            WHERE user_id = ${request.userId}
`;

        // If no settings exist yet, the trigger should have created them, 
        // but as a fallback, return defaults
        return settings || {
            preferred_model: 'gpt-4o',
            theme: 'dark',
            openai_api_key: null,
            anthropic_api_key: null,
            custom_instructions: null
        };
    });

    // Update settings
    typedApp.patch("/settings", {
        schema: {
            body: z.object({
                preferred_model: z.string().optional(),
                theme: z.string().optional(),
                openai_api_key: z.string().nullable().optional(),
                anthropic_api_key: z.string().nullable().optional(),
                custom_instructions: z.string().nullable().optional()
            })
        },
        preHandler: [requireAuth]
    }, async (request) => {
        const updates = request.body;

        const [updated] = await db`
            INSERT INTO user_settings(user_id, ${db(updates)})
VALUES(${request.userId}, ${db(updates)})
            ON CONFLICT(user_id) DO UPDATE
            SET ${db(updates)}, updated_at = NOW()
RETURNING *
    `;

        return updated;
    });
}
