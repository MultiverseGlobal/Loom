import "./src/env.js";
import { db } from "./src/db/client.js";

async function checkSearchPath() {
    try {
        const result = await db`SHOW search_path`;
        console.log('Search Path:', result[0].search_path);

        const currentSchema = await db`SELECT current_schema()`;
        console.log('Current Schema:', currentSchema[0].current_schema);

    } catch (err) {
        console.error("Failed to check search_path:", err);
    } finally {
        await db.end();
    }
}

checkSearchPath();
