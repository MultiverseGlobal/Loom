import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const rows = await db`SELECT id, result_json FROM analyses WHERE project_id IS NULL`;
        console.log(`Backfilling ${rows.length} analyses...`);

        for (const row of rows) {
            const projectId = (row.result_json as any)?.projectId;
            if (projectId && projectId !== 'pending') {
                try {
                    await db`UPDATE analyses SET project_id = ${projectId} WHERE id = ${row.id}`;
                    console.log(`Updated analysis ${row.id} with project ${projectId}`);
                } catch (e) {
                    console.error(`Failed to update ${row.id}:`, e.message);
                }
            }
        }
        console.log("Backfill complete.");
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
