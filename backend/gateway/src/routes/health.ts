import type { FastifyInstance } from "fastify";
import { z } from "zod";

const responseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
});

export async function registerHealthRoutes(app: FastifyInstance) {
  app.withTypeProvider().get(
    "/",
    {
      schema: {
        response: {
          200: responseSchema,
        },
      },
    },
    async () => ({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}

