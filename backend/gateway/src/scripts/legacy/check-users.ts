import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkPersistence() {
    try {
        console.log('--- Current Users ---');
        const users = await db`SELECT id, email FROM users`;
        console.table(users);
        console.log('Total:', users.length);

    } catch (err) {
        console.error("Failed:", err);
    } finally {
        await db.end();
    }
}

checkPersistence();
