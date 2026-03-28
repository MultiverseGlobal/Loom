// CRITICAL: Load environment variables FIRST
import "./env.js";
import fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { registerHealthRoutes } from "./routes/health.js";
import { registerIngestRoutes } from "./routes/ingest.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerDeltaRoutes } from "./routes/deltas.js";
import { registerExtensionRoutes } from "./routes/extensions.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { config } from "./config.js";
import { registerIntegration, initializeIntegration } from "./integrations/registry.js";
import { GitHubIntegration } from "./integrations/github.js";
import { registerBridgeRoutes } from "./routes/bridge.js";
import { registerCommandRoutes } from "./routes/commands.js";
import { registerConnectRoutes } from "./routes/connect.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { ensureDatabase } from "./db/setup.js";
import { registerGithubRoutes } from "./routes/github.js";
import { registerFigmaRoutes } from "./routes/figma.js";
import { registerWebsocketRoutes } from "./services/websocket.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerActivityRoutes } from "./routes/activity.js";
import { registerGenerateRoutes } from "./routes/generate.js";
import { registerIntegrationsRoutes } from "./routes/integrations.js";
import { LocalWorkerService } from "./services/localWorkerService.js";

const server = fastify({
  logger: true,
});

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

console.log(`[Shift AI] Booting Gateway - Build Time: ${new Date().toISOString()}`);

// Register Middleware
server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});
await server.register(cors, {
  origin: true, // Allow all origins for dev, or use config.corsOrigin
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
await server.register(helmet, { contentSecurityPolicy: false }); // Disable CSP for dev
await server.register(rateLimit);
await server.register(sensible);
await server.register(multipart);
await server.register(websocket);

// Initialize database (Defensive)
try {
  // Don't await here to prevent startup hang if DB is unreachable
  ensureDatabase().then(() => {
    server.log.info("Database initialized successfully.");
  }).catch(err => {
    server.log.error({ err }, "Database initialization failed. Some features may be unavailable.");
  });
} catch (err) {
  server.log.error({ err }, "Critical database setup error");
}

// ... (lines 43-66 skipped)

// Register Integration
try {
  registerIntegration("github", new GitHubIntegration({
    enabled: true,
    apiKey: config.githubApiKey
  }));

} catch (err) {
  server.log.error({ err }, "Failed to initialize integrations");
}

// Register routes
await server.register(registerHealthRoutes, { prefix: "/api/health" });
await server.register(registerAnalysisRoutes, { prefix: "/api" });
await server.register(registerBridgeRoutes, { prefix: "/api" });
await server.register(registerCommandRoutes, { prefix: "/api" });
await server.register(registerConnectRoutes, { prefix: "/api" });
await server.register(registerGithubRoutes, { prefix: "/api" });
await server.register(registerFigmaRoutes, { prefix: "/api" });
await server.register(registerFeedbackRoutes, { prefix: "/api" });
await server.register(registerWebsocketRoutes);
await server.register(registerProjectRoutes, { prefix: "/api/projects" });
await server.register(registerAiRoutes, { prefix: "/api" });
await server.register(registerSettingsRoutes, { prefix: "/api" });
await server.register(registerExtensionRoutes, { prefix: "/api/extensions" });
await server.register(registerActivityRoutes, { prefix: "/api" });
await server.register(registerGenerateRoutes, { prefix: "/api" });
await server.register(registerIntegrationsRoutes, { prefix: "/api" });
await server.register(registerIngestRoutes, { prefix: "/api" });
await server.register(registerJobRoutes, { prefix: "/api/jobs" });
await server.register(registerDeltaRoutes, { prefix: "/api/deltas" });

server
  .listen({ port: config.port, host: config.host })
  .then(async () => {
    server.log.info(`Gateway running on http://${config.host}:${config.port}`);

    // Start Local Worker if in Local Mode
    if (process.env.LOCAL_MODE === 'true') {
      await LocalWorkerService.start();
    }
  })
  .catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
