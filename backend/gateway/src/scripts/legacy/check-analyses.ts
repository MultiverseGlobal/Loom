import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const rows = await db`SELECT id, user_id, result_json FROM analyses LIMIT 10`;
        console.log("Analyses Count:", rows.length);
        rows.forEach(r => {
            console.log(`ID: ${r.id}, User: ${r.user_id}, Project: ${r.result_json?.projectId}`);
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
