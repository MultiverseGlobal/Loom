import './src/env.js';
import { db } from './src/db/client.js';
import fs from 'fs';

async function setup() {
    try {
        console.log('Creating commands table...');
        await db`
      CREATE TABLE IF NOT EXISTS commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        command_type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ
      );
    `;

        // Create an index for faster polling
        await db`CREATE INDEX IF NOT EXISTS idx_commands_device_status ON commands(device_id, status) WHERE status = 'pending'`;

        console.log('✅ Commands table created successfully');
        fs.writeFileSync('db-setup-commands.txt', 'SUCCESS');
    } catch (err: any) {
        console.error('❌ Failed to create commands table:', err);
        fs.writeFileSync('db-setup-commands.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

setup();
