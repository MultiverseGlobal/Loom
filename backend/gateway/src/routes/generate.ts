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
                const { prompt, framework } = request.body as any;
                const result = await aiEngine.generateUI(prompt, { framework });
                return result;
            } catch (error) {
                request.log.error(error);
                return reply.code(200).send({
                    code: "",
                    explanation: "Failed to generate UI. Please try again."
                });
            }
        },
    );

    app.withTypeProvider().post(
        "/architect",
        {
            schema: {
                body: z.object({ prompt: z.string().min(1) }),
            },
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            try {
                const { prompt } = request.body as any;
                const result = await aiEngine.architectProject(prompt);
                return result;
            } catch (error: any) {
                request.log.error(error);
                return reply.code(500).send({
                    error: "Failed to architect project",
                    details: error.message
                });
            }
        }
    );
}

