import "./src/env.js";
import { db } from "./src/db/client.js";
import { randomUUID } from "node:crypto";

async function testExplicitSchemaInsert() {
    const testUserId = randomUUID();
    const testEmail = `explicit-${testUserId.substring(0, 8)}@example.com`;

    try {
        console.log('--- Starting Explicit Schema Insertion Test ---');

        console.log('Step 1: Inserting user into public.users:', testUserId);
        await db`
            INSERT INTO public.users (id, email, full_name)
            VALUES (${testUserId}, ${testEmail}, 'Explicit User')
        `;

        console.log('Step 2: Creating project in public.projects...');
        const projectId = randomUUID();
        await db`
            INSERT INTO public.projects (id, user_id, name, framework, status)
            VALUES (${projectId}, ${testUserId}, 'Explicit Project', 'nextjs', 'ready')
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

testExplicitSchemaInsert();
