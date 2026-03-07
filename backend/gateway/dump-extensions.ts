import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    try {
        const extensions = await db`SELECT * FROM extensions`;
        console.log(JSON.stringify(extensions, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
