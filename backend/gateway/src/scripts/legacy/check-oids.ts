import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkOids() {
    try {
        console.log('--- OIDs and FK targets ---');
        const oids = await db`
            SELECT n.nspname as schema, c.relname as table, c.oid
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'users' OR c.relname = 'projects'
            ORDER BY n.nspname, c.relname
        `;
        console.table(oids);

        console.log('\n--- Foreign Key OID Targets ---');
        const fks = await db`
            SELECT 
                conname as constraint_name,
                conrelid::regclass as source_table,
                confrelid::regclass as target_table,
                confrelid as target_oid
            FROM pg_constraint
            WHERE contype = 'f' AND conname = 'fk_projects_user'
        `;
        console.table(fks);

    } catch (err) {
        console.error("Failed to check OIDs:", err);
    } finally {
        await db.end();
    }
}

checkOids();
