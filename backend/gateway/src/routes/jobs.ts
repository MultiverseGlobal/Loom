import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { getJobStatus } from "../services/queue.js";

const jobParamsSchema = z.object({
  id: z.string(),
});

const jobStatusResponse = z.object({
  jobId: z.string(),
  status: z.enum(["queued", "active", "completed", "failed", "unknown"]),
  progress: z.number().min(0).max(100).optional(),
  result: z.record(z.unknown()).optional(),
});

export async function registerJobRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: {
        params: jobParamsSchema,
        response: {
          200: jobStatusResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      return getJobStatus(id);
    },
  );
}

