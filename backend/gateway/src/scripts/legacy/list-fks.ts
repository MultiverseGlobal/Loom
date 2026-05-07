import "./src/env.js";
import { db } from "./src/db/client.js";

async function listAllFKs() {
    try {
        console.log('--- All Foreign Keys on "projects" ---');
        const fks = await db`
            SELECT
                conname as constraint_name,
                confrelid::regclass as target_table,
                a.attname as column_name
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conrelid = 'projects'::regclass
            AND c.contype = 'f'
        `;
        console.table(fks);

    } catch (err: any) {
        console.error("Failed to list FKs:", err.message);
    } finally {
        await db.end();
    }
}

listAllFKs();
