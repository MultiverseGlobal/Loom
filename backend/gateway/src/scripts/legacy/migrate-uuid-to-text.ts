import './src/env.js';
import { db } from './src/db/client.js';

async function migrate() {
    console.log("Starting migration: UUID to TEXT for device IDs...");

    try {
        // 1. Drop foreign key in commands
        console.log("Dropping foreign key constraint on commands(device_id)...");
        await db`ALTER TABLE commands DROP CONSTRAINT IF EXISTS commands_device_id_fkey`;

        // 2. Change extensions.id to TEXT
        console.log("Changing extensions.id to TEXT...");
        await db`ALTER TABLE extensions ALTER COLUMN id TYPE TEXT USING id::text`;

        // 3. Change commands.device_id to TEXT
        console.log("Changing commands.device_id to TEXT...");
        await db`ALTER TABLE commands ALTER COLUMN device_id TYPE TEXT USING device_id::text`;

        // 4. Restore foreign key
        console.log("Restoring foreign key constraint...");
        await db`ALTER TABLE commands ADD CONSTRAINT commands_device_id_fkey FOREIGN KEY (device_id) REFERENCES extensions(id) ON DELETE CASCADE`;

        console.log("✅ Migration successful!");
    } catch (err: any) {
        console.error("❌ Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
