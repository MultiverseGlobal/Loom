import { db } from "./src/db/client.js";

async function check() {
    console.log("--- USERS ---");
    const users = await db`SELECT id, email FROM auth.users`;
    console.log(JSON.stringify(users, null, 2));

    console.log("\n--- EXTENSIONS ---");
    const extensions = await db`SELECT * FROM extensions`;
    console.log(JSON.stringify(extensions, null, 2));

    console.log("\n--- PROJECTS ---");
    const projects = await db`SELECT id, name, user_id, source_url FROM projects`;
    console.log(JSON.stringify(projects, null, 2));

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
