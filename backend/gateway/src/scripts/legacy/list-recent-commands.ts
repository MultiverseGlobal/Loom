import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const rows = await db`SELECT * FROM commands ORDER BY created_at DESC LIMIT 5`;
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
