import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";

export interface StreamEvent {
  type: "job" | "delta" | "refactor" | "patch" | "healing" | "export";
  projectId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const activeConnections = new Map<string, Set<any>>();

export async function createSubscription(projectId: string, clientType = "ide", ttlHours = 24) {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  await db`
    INSERT INTO stream_subscriptions (id, project_id, token, client_type, expires_at)
    VALUES (${randomUUID()}, ${projectId}, ${token}, ${clientType}, ${expiresAt})
  `;

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function validateSubscription(token: string) {
  const [sub] = await db`
    SELECT * FROM stream_subscriptions
    WHERE token = ${token} AND expires_at > now()
  `;

  if (!sub) {
    return null;
  }

  return {
    projectId: sub.project_id as string,
    clientType: sub.client_type as string,
  };
}

export function registerConnection(token: string, connection: any) {
  if (!activeConnections.has(token)) {
    activeConnections.set(token, new Set());
  }
  activeConnections.get(token)!.add(connection);

  connection.socket.on("close", () => {
    const conns = activeConnections.get(token);
    if (conns) {
      conns.delete(connection);
      if (conns.size === 0) {
        activeConnections.delete(token);
      }
    }
  });
}

export async function broadcastEvent(event: StreamEvent) {
  const [subs] = await db`
    SELECT token FROM stream_subscriptions
    WHERE project_id = ${event.projectId} AND expires_at > now()
  `;

  const tokens = Array.isArray(subs) ? subs.map((s) => s.token as string) : subs ? [subs.token as string] : [];

  for (const token of tokens) {
    const conns = activeConnections.get(token);
    if (conns) {
      const message = JSON.stringify(event);
      for (const conn of conns) {
        try {
          conn.socket.send(message);
        } catch (err) {
          console.error(`Failed to send to connection: ${err}`);
        }
      }
    }
  }
}

export function getActiveConnectionCount(projectId?: string) {
  if (projectId) {
    return activeConnections.size;
  }
  return Array.from(activeConnections.values()).reduce((sum, set) => sum + set.size, 0);
}

