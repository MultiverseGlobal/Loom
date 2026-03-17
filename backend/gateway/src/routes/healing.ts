import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordFailure, attemptAutoHeal, getRecentFailures, markHealed } from "../services/healingService.js";

export async function registerHealingRoutes(app: FastifyInstance) {
  const recordBody = z.object({
    jobId: z.string(),
    jobType: z.string(),
    projectId: z.string().optional(),
    errorMessage: z.string(),
    errorStack: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
  });

  app.withTypeProvider().post(
    "/record",
    { schema: { body: recordBody } },
    async (request, reply) => {
      const id = await recordFailure(request.body as any);
      return reply.code(201).send({ failureId: id });
    },
  );

  app.withTypeProvider().post(
    "/heal/:failureId",
    { schema: { params: z.object({ failureId: z.string() }) } },
    async (request, reply) => {
      const { failureId } = request.params as { failureId: string };
      const result = await attemptAutoHeal(failureId);
      return reply.send(result);
    },
  );

  app.withTypeProvider().get(
    "/failures",
    {
      schema: {
        querystring: z.object({
          projectId: z.string().optional(),
          limit: z.coerce.number().optional().default(10),
        }),
      },
    },
    async (request) => {
      const { projectId, limit } = request.query as { projectId?: string; limit: number };
      const failures = await getRecentFailures(projectId, limit);
      return { failures };
    },
  );

  app.withTypeProvider().post(
    "/mark-healed/:failureId",
    { schema: { params: z.object({ failureId: z.string() }) } },
    async (request, reply) => {
      const { failureId } = request.params as { failureId: string };
      await markHealed(failureId);
      return reply.send({ success: true });
    },
  );
}

