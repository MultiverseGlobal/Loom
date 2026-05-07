import './src/env.js';
import { db } from './src/db/client.js';
import fs from 'fs';

async function check() {
    let output = '';
    const log = (msg: string, data?: any) => {
        output += msg + '\n';
        if (data) output += JSON.stringify(data, null, 2) + '\n';
        output += '-------------------\n';
    };

    try {
        log('--- ALL PROJECTS ---');
        const projects = await db`SELECT id, name, user_id, source_url, source_platform, status FROM projects`;
        log('Projects:', projects);

        log('--- ALL INTEGRATIONS ---');
        const integrations = await db`SELECT * FROM integrations`;
        log('Integrations:', integrations);

        fs.writeFileSync('db-projects-debug.txt', output);
    } catch (err: any) {
        fs.writeFileSync('db-projects-debug.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
