import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { aiEngine } from "../services/ai-engine.js";
import { requireAuth } from "../middleware/supabase-auth.js";

const generateBody = z.object({
    prompt: z.string().min(1),
    framework: z.string().optional().default("react"),
});

const generateResponse = z.object({
    code: z.string(),
    explanation: z.string(),
});

export async function registerGenerateRoutes(app: FastifyInstance) {
    app.withTypeProvider().post(
        "/generate",
        {
            schema: {
                body: generateBody,
                response: { 200: generateResponse },
            },
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            try {
                const { prompt, framework } = request.body;
                const result = await aiEngine.generateUI(prompt, { framework });
                return result;
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({
                    code: "",
                    explanation: "Failed to generate UI. Please try again."
                });
            }
        },
    );
}
