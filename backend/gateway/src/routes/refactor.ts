import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestRefactorSuggestions } from "../services/analyzerClient.js";

const requestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    )
    .min(1),
});

const suggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  files: z.array(z.string()),
  confidence: z.number(),
});

export async function registerRefactorRoutes(app: FastifyInstance) {
  app.withTypeProvider().post(
    "/",
    {
      schema: {
        body: requestSchema,
        response: {
          200: z.object({
            suggestions: z.array(suggestionSchema),
          }),
        },
      },
    },
    async (request) => {
      return requestRefactorSuggestions(request.body as any);
    },
  );
}

