import "./src/env.js";
import { db } from "./src/db/client.js";

async function diagnose() {
    try {
        console.log('--- Connection Info ---');
        const user = await db`SELECT current_user, session_user, current_database(), version()`;
        console.table(user);

        console.log('\n--- Searching for Function "on_auth_user_created" ---');
        const funcs = await db`
            SELECT n.nspname as schema, p.proname, p.prosrc
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.proname = 'on_auth_user_created'
        `;
        if (funcs.length === 0) {
            console.log('❌ Function NOT found in any schema.');
        } else {
            console.table(funcs.map(f => ({ schema: f.schema, name: f.proname, src_preview: f.prosrc.substring(0, 50) + '...' })));
            console.log('--- Full Source ---');
            console.log(funcs[0].prosrc);
        }

        console.log('\n--- Detailed FK Constraint Check ---');
        const fk = await db`
            SELECT 
                conname,
                conrelid::regclass as source_table,
                confrelid::regclass as target_table,
                confrelid as target_table_oid
            FROM pg_constraint
            WHERE conname = 'fk_projects_user'
        `;
        console.table(fk);

        console.log('\n--- Checking OID for public.users ---');
        const publicUsers = await db`
            SELECT 'public.users'::regclass::oid as oid
        `;
        console.table(publicUsers);

        if (fk.length > 0 && publicUsers.length > 0) {
            const match = fk[0].target_table_oid === publicUsers[0].oid;
            console.log(`\nFK Target OID (${fk[0].target_table_oid}) matches public.users OID (${publicUsers[0].oid})? ${match ? '✅ YES' : '❌ NO'}`);
        }

    } catch (err: any) {
        console.error("Diagnosis Failed:", err.message);
    } finally {
        await db.end();
    }
}

diagnose();
