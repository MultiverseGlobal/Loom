import "./src/env.js";
import { db } from "./src/db/client.js";

async function listCols() {
    try {
        const columns = await db`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects'
        `;
        const names = columns.map(c => c.column_name);
        console.log("PROJECTS_COLS_LIST:", JSON.stringify(names));
    } catch (err) {
        console.error("Failed to list columns:", err);
    } finally {
        await db.end();
    }
}

listCols();
