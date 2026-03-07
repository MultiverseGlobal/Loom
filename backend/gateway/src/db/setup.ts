import { db } from "./client.js";
import { createTablesSql } from "./schema.js";

export async function ensureDatabase() {
  await db.unsafe(createTablesSql);

  // Migration: Ensure columns exist (idempotent)
  await db.unsafe(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_platform TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS origin_meta JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
    
    ALTER TABLE analyses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}

