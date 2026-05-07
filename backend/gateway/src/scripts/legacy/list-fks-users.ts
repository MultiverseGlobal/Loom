import "./src/env.js";
import { db } from "./src/db/client.js";

async function listUsersFKs() {
    try {
        console.log('--- Foreign Keys on "users" (public) ---');
        const fks = await db`
            SELECT
                conname as constraint_name,
                confrelid::regclass as target_table,
                a.attname as column_name
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conrelid = 'public.users'::regclass
            AND c.contype = 'f'
        `;
        console.table(fks);

    } catch (err: any) {
        console.error("Failed to list FKs:", err.message);
    } finally {
        await db.end();
    }
}

listUsersFKs();
