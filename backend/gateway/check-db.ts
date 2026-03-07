
import { db } from "./src/db/client.js";

async function checkProjects() {
    console.log("--- DB PROJECT CHECK ---");
    try {
        const projects = await db`SELECT id, name, user_id, created_at FROM projects ORDER BY created_at DESC LIMIT 20`;
        console.log(`Found ${projects.length} total projects in DB:`);
        console.table(projects.map(p => ({
            id: p.id.substring(0, 8) + "...",
            name: p.name,
            user_id: p.user_id.substring(0, 8) + "...",
            created_at: p.created_at
        })));

        const localUserId = '3f3e183a-b144-4882-9014-ea5aa1a2d585';
        const localProjects = projects.filter(p => p.user_id === localUserId);
        console.log(`\nProjects owned by Local User (${localUserId}): ${localProjects.length}`);

    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        process.exit(0);
    }
}

checkProjects();
