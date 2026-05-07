import "./src/env.js";
import { db } from "./src/db/client.js";
import { randomUUID } from "node:crypto";

async function testTransactionInsert() {
    const testUserId = '00000000-0000-0000-0000-000000000002';
    const testEmail = 'test2@example.com';

    try {
        console.log('--- Starting Transactional Insertion Test ---');

        await db.begin(async (sql) => {
            console.log('Step 1: Ensuring user exists...');
            await sql`
                INSERT INTO users (id, email, full_name)
                VALUES (${testUserId}, ${testEmail}, 'Test User 2')
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    updated_at = now()
            `;

            console.log('Step 2: Creating project...');
            const projectId = randomUUID();
            await sql`
                INSERT INTO projects (id, user_id, name, framework, status)
                VALUES (${projectId}, ${testUserId}, 'Transaction Project', 'nextjs', 'ready')
            `;

            console.log('✅ SUCCESS inside transaction: PK ID:', projectId);
        });

        console.log('✅ External Verify: SUCCESS');

    } catch (err: any) {
        console.error('❌ FAILED:');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        console.error('Code:', err.code);
    } finally {
        await db.end();
    }
}

testTransactionInsert();
