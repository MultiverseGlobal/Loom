import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";

export type DeltaRecord = {
  id: string;
  project_id: string;
  source: "builder" | "local";
  title: string;
  impact?: string;
  action?: string;
  payload?: Record<string, unknown>;
  created_at: string;
};

export async function listDeltas(projectId?: string) {
  if (!projectId) {
    return db<DeltaRecord[]>`
      SELECT * FROM project_deltas
      ORDER BY created_at DESC
      LIMIT 50
    `;
  }
  return db<DeltaRecord[]>`
    SELECT * FROM project_deltas
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

export async function getDelta(deltaId: string) {
  const rows = await db<DeltaRecord[]>`
    SELECT * FROM project_deltas WHERE id = ${deltaId}
  `;
  return rows[0] ?? null;
}

type DeltaInput = {
  projectId: string;
  source: "builder" | "local";
  title: string;
  impact?: string;
  action?: string;
  payload?: Record<string, unknown>;
};

export async function createDelta(input: DeltaInput) {
  const id = randomUUID();
  await db`
    INSERT INTO project_deltas (id, project_id, source, title, impact, action, payload)
    VALUES (${id}, ${input.projectId}, ${input.source}, ${input.title}, ${input.impact ?? null}, ${input.action ?? null}, ${db.json(
    (input.payload as any) ?? {},
  )})
  `;
  return id;
}

