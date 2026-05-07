import './src/env.js';
import { db } from './src/db/client.js';

async function run() {
    const res = await db`SELECT id, email, full_name, credits FROM users`;
    console.table(res);
    process.exit(0);
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
