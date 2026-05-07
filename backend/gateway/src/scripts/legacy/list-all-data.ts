import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    console.log("--- USERS ---");
    const users = await db`SELECT id, email, created_at FROM users`;
    console.table(users);

    console.log("\n--- EXTENSIONS ---");
    const extensions = await db`SELECT id, user_id, last_seen, created_at FROM extensions ORDER BY last_seen DESC`;
    console.table(extensions);

    console.log("\n--- PAIRING SESSIONS ---");
    const sessions = await db`SELECT id, device_id, status, user_id, extension_token, created_at FROM pairing_sessions ORDER BY created_at DESC LIMIT 10`;
    console.table(sessions);

    console.log("\n--- PROJECTS ---");
    const projects = await db`SELECT id, name, user_id, status, created_at FROM projects ORDER BY created_at DESC LIMIT 20`;
    console.table(projects);

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
