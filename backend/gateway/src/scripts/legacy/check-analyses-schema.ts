import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const columns = await db`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'analyses'
        `;
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
