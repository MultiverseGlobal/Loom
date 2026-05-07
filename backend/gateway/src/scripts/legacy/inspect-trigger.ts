import "./src/env.js";
import { db } from "./src/db/client.js";

async function inspectTrigger() {
    try {
        console.log('--- Inspecting Trigger OID ---');
        const triggers = await db`
            SELECT 
                tgname,
                tgrelid::regclass as table_name,
                tgfoid,
                tgtype,
                tgenabled
            FROM pg_trigger
            WHERE tgname = 'on_auth_user_created'
        `;
        console.table(triggers);

        if (triggers.length > 0) {
            const funcOid = triggers[0].tgfoid;
            console.log('--- Function Details for OID', funcOid, '---');
            const func = await db`
                SELECT proname, prosrc, n.nspname as schema
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE p.oid = ${funcOid}
            `;
            console.table(func);

            if (func.length > 0) {
                console.log(func[0].prosrc);
            }
        }

    } catch (err: any) {
        console.error("Diagnosis Failed:", err.message);
    } finally {
        await db.end();
    }
}

inspectTrigger();
