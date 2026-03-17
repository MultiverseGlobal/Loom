import '../env.js';
import { db } from '../db/client.js';

async function checkSchema() {
    try {
        const columns = await db`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'project_files'
        `;
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
