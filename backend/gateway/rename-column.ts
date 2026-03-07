import "./src/env.js";
import { db } from "./src/db/client.js";

async function renameColumn() {
    try {
        console.log('--- Renaming github_url to source_url ---');

        await db`
            ALTER TABLE projects 
            RENAME COLUMN github_url TO source_url
        `;

        console.log('✅ Success: github_url renamed to source_url.');

    } catch (err: any) {
        if (err.message.includes('does not exist')) {
            console.log('ℹ️ github_url does not exist. Checking for source_url...');
            const result = await db`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'projects' AND column_name = 'source_url'
            `;
            if (result.length > 0) {
                console.log('✅ source_url already exists.');
            } else {
                console.log('❌ Neither github_url nor source_url found. Adding source_url...');
                await db`ALTER TABLE projects ADD COLUMN source_url TEXT`;
                console.log('✅ source_url added.');
            }
        } else {
            console.error('❌ Rename Failed:', err.message);
        }
    } finally {
        await db.end();
    }
}

renameColumn();
