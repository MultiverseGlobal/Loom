import "./src/env.js";
import { db } from "./src/db/client.js";
import { randomUUID } from "node:crypto";

async function testDisableTriggers() {
    const testUserId = randomUUID();

    try {
        console.log('--- Starting Disable Triggers Test ---');

        await db.begin(async (sql) => {
            console.log('Step 1: Disabling triggers on users...');
            await sql`ALTER TABLE public.users DISABLE TRIGGER ALL`;

            console.log('Step 2: Inserting user:', testUserId);
            await sql`
                INSERT INTO public.users (id, email, full_name)
                VALUES (${testUserId}, 'no-trigger@example.com', 'No Trigger User')
            `;

            console.log('Step 3: Creating project...');
            const projectId = randomUUID();
            await sql`
                INSERT INTO public.projects (id, user_id, name, framework, status)
                VALUES (${projectId}, ${testUserId}, 'No Trigger Project', 'nextjs', 'ready')
            `;

            console.log('✅ SUCCESS inside transaction!');

            // Re-enable triggers? If we commit, they stay disabled?
            // Usually we roll back or re-enable.
            // Let's roll back to be safe, but report success.
            throw new Error('ROLLBACK_INTENTIONAL');
        });

    } catch (err: any) {
        if (err.message === 'ROLLBACK_INTENTIONAL') {
            console.log('✅ Proof of Concept SUCCESS (Transaction rolled back manually)');
        } else {
            console.error('❌ FAILED:', err.message);
            console.error('Code:', err.code);
            console.error('Detail:', err.detail);
        }
    } finally {
        // Ensure triggers re-enabled if transaction committed (unlikely)
        try {
            await db`ALTER TABLE public.users ENABLE TRIGGER ALL`;
        } catch (e) {
            // Ignore
        }
        await db.end();
    }
}

testDisableTriggers();
