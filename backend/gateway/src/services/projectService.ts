import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { logActivity } from "./activityService.js";

export type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  framework: string | null;
  source_platform: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
};

export async function createProject(
  userId: string,
  name: string,
  framework?: string,
  sourcePlatform = 'shift',
  sourceUrl?: string,
  originMeta: Record<string, any> = {}
) {
  try {
    const id = randomUUID();

    console.log(`[ProjectService] Creating project: ${id} for user ${userId}`);
    await db`
      INSERT INTO projects (id, user_id, name, framework, source_platform, source_url, origin_meta, status)
      VALUES (${id}, ${userId}, ${name}, ${framework ?? 'nextjs'}, ${sourcePlatform}, ${sourceUrl ?? null}, ${db.json(originMeta)}, 'ready')
    `;
    console.log(`[ProjectService] DB Insert Successful: ${id}`);

    await logActivity(userId, 'PROJECT_CREATED', { projectId: id, name, framework });

    return id;
  } catch (error: any) {
    throw error;
  }
}

export async function getProject(id: string) {
  const rows = await db<ProjectRecord[]>`
    SELECT * FROM projects WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function listProjects(userId?: string, limit = 50) {
  if (userId) {
    return db<ProjectRecord[]>`
      SELECT * FROM projects
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }
  return db<ProjectRecord[]>`
    SELECT * FROM projects
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
export async function deleteProject(id: string) {
  await db`
    DELETE FROM projects WHERE id = ${id}
  `;
}

export async function updateProject(id: string, updates: Partial<ProjectRecord>) {
  if (Object.keys(updates).length === 0) return;

  await db`
    UPDATE projects SET ${db(updates)} 
    WHERE id = ${id}
  `;
}
