import { db } from "../db/client.js";

export type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  tier: string;
  created_at: string;
};

/**
 * Ensures a user exists in the local database.
 * Matches the Supabase Auth ID and syncs basic profile info.
 */
export async function ensureUser(id: string, email: string, fullName?: string) {
  try {
    const result = await db`
    INSERT INTO users (id, email, full_name)
    VALUES (${id}, ${email}, ${fullName ?? null})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(users.full_name, EXCLUDED.full_name),
      updated_at = now()
    RETURNING id, email, created_at
  `;
    return result[0];
  } catch (error: any) {
    throw error;
  }
}

export async function getUser(id: string) {
  const rows = await db<UserRecord[]>`
    SELECT * FROM users WHERE id = ${id}
  `;
  return rows[0] ?? null;
}
