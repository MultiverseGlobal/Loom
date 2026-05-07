import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkTriggerFunction() {
    try {
        console.log('--- Trigger Function Source: on_auth_user_created ---');
        const func = await db`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'on_auth_user_created'
        `;
        if (func.length > 0) {
            console.log(func[0].prosrc);
        } else {
            console.log('Function not found.');
        }

    } catch (err: any) {
        console.error("Failed to check trigger function:", err.message);
    } finally {
        await db.end();
    }
}

checkTriggerFunction();
