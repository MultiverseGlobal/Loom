import "./src/env.js";
import { db } from "./src/db/client.js";
import { randomUUID } from "node:crypto";

async function testExistingUserInsert() {
    const existingUserId = '0317b27c-aa56-4f9a-a893-e067ede4f638';

    try {
        console.log('--- Starting Existing User Insertion Test ---');

        console.log('Step 1: Verifying existing user exists...');
        const user = await db`SELECT id FROM users WHERE id = ${existingUserId}`;
        if (user.length === 0) {
            console.error('❌ ERROR: Existing User NOT found!');
            return;
        }
        console.log('✅ User found:', user[0].id);

        console.log('Step 2: Creating project...');
        const projectId = randomUUID();
        await db`
            INSERT INTO projects (id, user_id, name, framework, status)
            VALUES (${projectId}, ${existingUserId}, 'Existing User Project', 'nextjs', 'ready')
        `;
        console.log('✅ SUCCESS: Project created with ID:', projectId);

    } catch (err: any) {
        console.error('❌ FAILED:');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        console.error('Code:', err.code);
    } finally {
        await db.end();
    }
}

testExistingUserInsert();
