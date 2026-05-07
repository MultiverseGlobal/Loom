import "./src/env.js";
import { db } from "./src/db/client.js";

async function fixFK() {
    try {
        console.log('--- Recreating Foreign Key FK_projects_user ---');

        console.log('Step 1: Dropping constraint...');
        await db`ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_user`;

        console.log('Step 2: Adding constraint back...');
        await db`
            ALTER TABLE projects 
            ADD CONSTRAINT fk_projects_user 
            FOREIGN KEY (user_id) REFERENCES users(id) 
            ON DELETE CASCADE
        `;

        console.log('✅ Success: FK Recreated.');

    } catch (err: any) {
        console.error("Fix Failed:", err.message);
    } finally {
        await db.end();
    }
}

fixFK();
