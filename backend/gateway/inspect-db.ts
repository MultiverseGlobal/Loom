import "./src/env.js";
import { db } from "./src/db/client.js";

async function inspect() {
    console.log("--- DB INSPECTION ---");
    try {
        const users = await db`SELECT id, email, created_at FROM users LIMIT 10`;
        console.log("Recent Users:", users);

        const projects = await db`SELECT id, name, user_id, created_at FROM projects LIMIT 10`;
        console.log("Recent Projects:", projects);

    } catch (err) {
        console.error("Inspection failed:", err);
    } finally {
        await db.end();
    }
}

inspect();
