import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import axios from "axios";

const responseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
  diagnostics: z.object({
    openai_key: z.boolean(),
    anthropic_key: z.boolean(),
    gemini_key: z.boolean(),
    analyzer_url: z.string(),
    analyzer_reachable: z.boolean(),
  }),
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
    async () => {
      let analyzerReachable = false;
      try {
        const res = await axios.get(`${config.analyzerUrl}/health`, { timeout: 2000 });
        analyzerReachable = res.status === 200;
      } catch (e) {
        analyzerReachable = false;
      }

      return {
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        diagnostics: {
          openai_key: !!config.openaiApiKey,
          anthropic_key: !!config.anthropicApiKey,
          gemini_key: !!config.geminiApiKey,
          analyzer_url: config.analyzerUrl,
          analyzer_reachable: analyzerReachable
        }
      };
    },
  );
}

