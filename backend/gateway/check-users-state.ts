import './src/env.js';
import { db } from './src/db/client.js';
import fs from 'fs';

async function check() {
    try {
        const users = await db`SELECT id, email FROM users`;
        fs.writeFileSync('db-users-debug.txt', JSON.stringify(users, null, 2));
    } catch (err: any) {
        fs.writeFileSync('db-users-debug.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
