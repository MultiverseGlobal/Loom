import type { FastifyInstance } from "fastify";
import { validateSubscription, registerConnection } from "../services/streamService.js";

export async function registerStreamRoutes(app: FastifyInstance) {
  app.register(async function (fastify) {
    fastify.get(
      "/ws",
      { websocket: true },
      (connection, req) => {
        const token = (req.query as { token?: string })?.token;

        if (!token) {
          connection.close(1008, "Missing token");
          return;
        }

        validateSubscription(token).then((sub) => {
          if (!sub) {
            connection.close(1008, "Invalid or expired token");
            return;
          }

          registerConnection(token, connection);

          connection.on("message", (message: any) => {
            try {
              const data = JSON.parse(message.toString());
              if (data.type === "ping") {
                connection.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
              }
            } catch (err) {
              console.error("Error handling WebSocket message:", err);
            }
          });

          connection.send(
            JSON.stringify({
              type: "connected",
              projectId: sub.projectId,
              timestamp: new Date().toISOString(),
            }),
          );
        });
      },
    );

    fastify.post("/subscribe", async (request, reply) => {
      const body = request.body as { projectId: string; clientType?: string; ttlHours?: number };
      const { createSubscription } = await import("../services/streamService.js");
      const sub = await createSubscription(body.projectId, body.clientType, body.ttlHours);
      return reply.send(sub);
    });
  });
}
