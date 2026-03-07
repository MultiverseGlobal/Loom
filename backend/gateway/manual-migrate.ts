import "./src/env.js";
import { db } from "./src/db/client.js";

async function migrate() {
    console.log("🚀 Starting manual migration...");
    try {
        // 1. Ensure pgcrypto for gen_random_uuid()
        await db.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        console.log("✅ Extension pgcrypto ensured.");

        // 2. Add missing columns to projects
        await db.unsafe(`
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_platform TEXT;
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS origin_meta JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
        `);
        console.log("✅ projects table columns ensured.");

        // 3. Ensure activity_logs table
        await db.unsafe(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                ip_address TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);
        console.log("✅ activity_logs table ensured.");

        console.log("🎉 Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

migrate();
