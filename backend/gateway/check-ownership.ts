import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const users = await db`SELECT id, email, full_name FROM users`;
        const extensions = await db`SELECT id, user_id, last_seen FROM extensions`;

        console.log("--- USERS ---");
        console.table(users);

        console.log("\n--- EXTENSIONS ---");
        extensions.forEach(ext => {
            const match = users.find(u => u.id === ext.user_id);
            console.log(`ID: ${ext.id}, User: ${ext.user_id} (${match ? match.email : 'NOT FOUND IN USERS'})`);
        });

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
