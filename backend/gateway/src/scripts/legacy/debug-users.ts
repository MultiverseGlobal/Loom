import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const extensions = await db`SELECT * FROM extensions`;
        const users = await db`SELECT * FROM users`;
        console.log("--- USERS ---");
        users.forEach(u => console.log(`User: ${u.id} | Email: ${u.email}`));
        console.log("--- EXTENSIONS ---");
        extensions.forEach(e => console.log(`Device: ${e.id} | User: ${e.user_id} | Last Seen: ${e.last_seen}`));
    } catch (err) {
        console.error("DB Error:", err);
    }
    process.exit(0);
}
run();
