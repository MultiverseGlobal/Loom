import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listDeltas, getDelta } from "../services/deltaService.js";
import { enqueueDeltaScanJob } from "../services/queue.js";

const listQuery = z.object({
  projectId: z.string().uuid().optional(),
});

const scanBody = z.object({
  projectId: z.string().uuid(),
  direction: z.enum(["builder", "local"]).default("builder"),
});

const deltaResponse = z.object({
  id: z.string(),
  project_id: z.string(),
  source: z.enum(["builder", "local"]),
  title: z.string(),
  impact: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  payload: z.record(z.any()).nullable().optional(),
  created_at: z.string(),
});

export async function registerDeltaRoutes(app: FastifyInstance) {
  app.withTypeProvider().get(
    "/",
    {
      schema: {
        querystring: listQuery,
        response: {
          200: z.array(deltaResponse),
        },
      },
    },
    async (request) => {
      const query = request.query as { projectId?: string };
      return listDeltas(query.projectId);
    },
  );

  app.withTypeProvider().get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: deltaResponse },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const delta = await getDelta(params.id);
      if (!delta) {
        return reply.notFound("Delta not found");
      }
      return delta;
    },
  );

  app.withTypeProvider().post(
    "/scan",
    {
      schema: {
        body: scanBody,
        response: {
          202: z.object({ jobId: z.string(), status: z.literal("queued") }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const jobId = await enqueueDeltaScanJob(body);
      return reply.code(202).send({ jobId, status: "queued" });
    },
  );
}

