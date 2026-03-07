import type { FastifyInstance } from "fastify";
import { z } from "zod";

const exportRecord = z.object({
  id: z.string(),
  project_id: z.string(),
  status: z.string(),
  artifact_url: z.string().nullable(),
  docs_url: z.string().nullable(),
  tests_url: z.string().nullable(),
  created_at: z.string(),
});

export async function registerExportRoutes(app: FastifyInstance) {
  app.withTypeProvider().get(
    "/:projectId",
    {
      schema: {
        params: z.object({ projectId: z.string().uuid() }),
        response: {
          200: z.array(exportRecord),
        },
      },
    },
    async () => {
      return [];
    },
  );
}

