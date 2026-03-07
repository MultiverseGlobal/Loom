import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkSchema() {
    try {
        const tables = ['projects', 'users'];
        for (const table of tables) {
            console.log(`\n--- Schema for table: ${table} ---`);
            const columns = await db`
                SELECT table_schema, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = ${table}
                ORDER BY table_schema, ordinal_position
            `;
            console.table(columns);
        }

        console.log('\n--- Detailed Foreign Keys ---');
        const fks = await db`
            SELECT
                tc.constraint_name,
                tc.table_schema as source_schema,
                tc.table_name as source_table,
                kcu.column_name as source_column,
                ccu.table_schema as target_schema,
                ccu.table_name as target_table,
                ccu.column_name as target_column
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name IN ('users', 'projects')
        `;
        console.table(fks);

    } catch (err) {
        console.error("Failed to check schema:", err);
    } finally {
        await db.end();
    }
}

checkSchema();
