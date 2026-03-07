import "./src/env.js";
import { db } from "./src/db/client.js";
import { randomUUID } from "node:crypto";

async function testInsertVerify() {
    const testUserId = randomUUID(); // New UUID every time
    const testEmail = `test-${testUserId.substring(0, 8)}@example.com`;

    try {
        console.log('--- Starting Insertion & Verification Test ---');

        console.log('Step 1: Inserting user:', testUserId);
        await db`
            INSERT INTO users (id, email, full_name)
            VALUES (${testUserId}, ${testEmail}, 'Verify User')
        `;

        console.log('Step 2: verifying user existence...');
        const user = await db`SELECT id FROM users WHERE id = ${testUserId}`;
        if (user.length === 0) {
            console.error('❌ ERROR: User was NOT found immediately after insert!');
        } else {
            console.log('✅ User found in DB:', user[0].id);

            console.log('Step 3: Creating project...');
            const projectId = randomUUID();
            await db`
                INSERT INTO projects (id, user_id, name, framework, status)
                VALUES (${projectId}, ${testUserId}, 'Verified Project', 'nextjs', 'ready')
            `;
            console.log('✅ SUCCESS: Project created with ID:', projectId);
        }

    } catch (err: any) {
        console.error('❌ FAILED:');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        console.error('Code:', err.code);
    } finally {
        await db.end();
    }
}

testInsertVerify();
