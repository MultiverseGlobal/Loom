import './src/env.js';
import { db } from './src/db/client.js';
import fs from 'fs';

async function check() {
    try {
        const rows = await db`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
        fs.writeFileSync('db-tables-list.txt', JSON.stringify(rows.map(r => r.tablename), null, 2));
    } catch (err: any) {
        fs.writeFileSync('db-tables-list.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
