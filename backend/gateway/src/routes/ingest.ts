import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { enqueueIngestJob } from "../services/queue.js";

import { requireAuth } from "../middleware/supabase-auth.js";

const ingestRequestSchema = z.object({
  projectId: z.string().uuid().optional(),
  projectName: z.string().min(1).max(120).optional(),
  sourceType: z.enum(["zip", "repo", "clipboard", "folder"]),
  sourceUri: z.string().optional(),
  metadata: z
    .object({
      frameworkHint: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
    .default({}),
});

const ingestResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal("queued"),
});

export async function registerIngestRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/ingest",
    {
      preHandler: [requireAuth],
      schema: {
        body: ingestRequestSchema,
        response: {
          202: ingestResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const userId = (request as any).userId;

      if (!body.projectId && !body.projectName) {
        return reply.badRequest("Provide projectId or projectName");
      }

      const jobId = await enqueueIngestJob({
        ...body,
        userId: userId as string
      });

      if (!jobId) {
        return reply.internalServerError("Failed to queue ingest job");
      }

      return reply.code(202).send({ jobId, status: "queued" });
    },
  );
}

