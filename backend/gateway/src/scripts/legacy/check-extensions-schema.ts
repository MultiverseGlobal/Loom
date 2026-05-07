import './src/env.js';
import { db } from './src/db/client.js';
import fs from 'fs';

async function check() {
    try {
        const rows = await db`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'extensions'
    `;
        fs.writeFileSync('db-extensions-schema.txt', JSON.stringify(rows, null, 2));
    } catch (err: any) {
        fs.writeFileSync('db-extensions-schema.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
