import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enqueuePatchJob } from "../services/queue.js";
import { getPatch } from "../services/patchService.js";

const requestBody = z.object({
  deltaId: z.string().uuid(),
});

const patchResponse = z.object({
  id: z.string(),
  delta_id: z.string(),
  status: z.string(),
  artifact_url: z.string().nullable().optional(),
  created_at: z.string(),
});

export async function registerPatchRoutes(app: FastifyInstance) {
  app.withTypeProvider().post(
    "/",
    {
      schema: {
        body: requestBody,
        response: {
          202: z.object({ jobId: z.string(), status: z.literal("queued") }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const jobId = await enqueuePatchJob({ deltaId: body.deltaId });
      return reply.code(202).send({ jobId, status: "queued" });
    },
  );

  app.withTypeProvider().get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: patchResponse,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as any;
      const patch = await getPatch(params.id);
      if (!patch) {
        return reply.notFound("Patch not found");
      }
      return patch;
    },
  );
}

