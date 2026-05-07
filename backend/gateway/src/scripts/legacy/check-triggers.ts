import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkTriggers() {
    try {
        console.log('--- Triggers on users and projects ---');
        const triggers = await db`
            SELECT 
                tgname as trigger_name,
                relname as table_name,
                tgtype,
                tgisinternal
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            WHERE c.relname IN ('users', 'projects')
            ORDER BY table_name, trigger_name
        `;
        console.table(triggers);

    } catch (err) {
        console.error("Failed to check triggers:", err);
    } finally {
        await db.end();
    }
}

checkTriggers();
