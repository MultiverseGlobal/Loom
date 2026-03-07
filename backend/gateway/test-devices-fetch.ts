import './src/env.js';
import { db } from './src/db/client.js';
import * as commandService from './src/services/commandService.js';
import fs from 'fs';

async function check() {
    const userId = '3f3e183a-b144-4882-9014-ea5aa1a2d585'; // bytemge@gmail.com
    try {
        const devices = await commandService.getUserDevices(userId);
        fs.writeFileSync('test-devices-fetch.txt', JSON.stringify(devices, null, 2));
    } catch (err: any) {
        fs.writeFileSync('test-devices-fetch.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        process.exit(0);
    }
}

check();
