import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkRLS() {
    try {
        console.log('--- RLS Status from pg_class ---');
        const rls = await db`
            SELECT n.nspname as schema, c.relname as table, c.relrowsecurity, c.relforcerowsecurity
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname IN ('users', 'projects')
            AND n.nspname = 'public'
        `;
        console.table(rls);

        console.log('\n--- RLS Policies from pg_policies ---');
        const policies = await db`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
            FROM pg_policies
            WHERE tablename IN ('users', 'projects')
        `;
        console.table(policies);

    } catch (err: any) {
        console.error("Failed to check RLS:", err.message);
    } finally {
        await db.end();
    }
}

checkRLS();
