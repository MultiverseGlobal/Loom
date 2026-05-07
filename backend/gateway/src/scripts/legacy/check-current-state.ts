import './src/env.js';
import { db } from './src/db/client.js';
import * as commandService from './src/services/commandService.js';
import { getProject } from './src/services/projectService.js';
import fs from 'fs';

async function check() {
    let output = '';
    const log = (msg: string, data?: any) => {
        output += msg + '\n';
        if (data) output += JSON.stringify(data, null, 2) + '\n';
        output += '-------------------\n';
    };

    try {
        log('--- ALL EXTENSIONS W/ STATUS ---');
        const allExtensions = await db`SELECT * FROM extensions`;
        const now = new Date().getTime();
        const processed = allExtensions.map(r => ({
            ...r,
            calc_status: r.last_seen ? (now - new Date(r.last_seen).getTime() < 30000 ? 'online' : 'offline') : 'never_seen'
        }));
        log('Extensions:', processed);

        fs.writeFileSync('db-state-debug.txt', output);
    } catch (err: any) {
        fs.writeFileSync('db-state-debug.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
