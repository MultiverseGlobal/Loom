import './src/env.js';
import { db } from './src/db/client.js';

async function check() {
    console.log("--- TABLE SCHEMAS ---");
    const columns = await db`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('extensions', 'commands', 'pairing_sessions')
    ORDER BY table_name, ordinal_position
  `;
    console.table(columns);

    console.log("\n--- RECENT PAIRING SESSIONS ---");
    const sessions = await db`SELECT id, device_id, status, user_id, created_at FROM pairing_sessions ORDER BY created_at DESC LIMIT 5`;
    console.table(sessions);

    console.log("\n--- RECENT EXTENSIONS ---");
    const extensions = await db`SELECT id, user_id, last_seen FROM extensions ORDER BY last_seen DESC LIMIT 5`;
    console.table(extensions);

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
