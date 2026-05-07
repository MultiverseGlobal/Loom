import "./src/env.js";
import { db } from "./src/db/client.js";

async function maintenance() {
    try {
        console.log('--- Starting Maintenance ---');

        console.log('Step 1: Reindexing users...');
        await db`REINDEX TABLE users`;

        console.log('Step 2: Reindexing projects...');
        await db`REINDEX TABLE projects`;

        console.log('Step 3: Vacuum Analyze...');
        await db`VACUUM ANALYZE users`;
        await db`VACUUM ANALYZE projects`;

        console.log('✅ Maintenance Complete.');

    } catch (err: any) {
        console.error("Maintenance Failed:", err.message);
    } finally {
        await db.end();
    }
}

maintenance();
