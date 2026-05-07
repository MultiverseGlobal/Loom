import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkTableType() {
    try {
        console.log('--- Table Types ---');
        const result = await db`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_name IN ('users', 'projects')
            ORDER BY table_name
        `;
        console.table(result);

        console.log('\n--- Row Counts ---');
        const userCount = await db`SELECT count(*) FROM users`;
        const projectCount = await db`SELECT count(*) FROM projects`;
        console.log('User count:', userCount[0].count);
        console.log('Project count:', projectCount[0].count);

        console.log('\n--- User IDs in DB ---');
        const users = await db`SELECT id, email FROM users LIMIT 10`;
        console.table(users);

    } catch (err) {
        console.error("Failed to check table type:", err);
    } finally {
        await db.end();
    }
}

checkTableType();
