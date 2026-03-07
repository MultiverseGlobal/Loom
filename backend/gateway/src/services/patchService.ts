import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";

type PatchRecord = {
  id: string;
  delta_id: string;
  status: string;
  artifact_url: string | null;
  created_at: string;
};

export async function requestPatch(deltaId: string) {
  const id = randomUUID();
  await db`
    INSERT INTO patches (id, delta_id, status)
    VALUES (${id}, ${deltaId}, ${"queued"})
  `;
  return id;
}

export async function completePatch(patchId: string, artifactUrl: string) {
  await db`
    UPDATE patches
    SET status = ${"completed"}, artifact_url = ${artifactUrl}
    WHERE id = ${patchId}
  `;
}

export async function getPatch(patchId: string) {
  const rows = await db<PatchRecord[]>`
    SELECT * FROM patches WHERE id = ${patchId}
  `;
  return rows[0] ?? null;
}

