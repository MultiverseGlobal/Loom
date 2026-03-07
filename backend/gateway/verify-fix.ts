import "./src/env.js";
import { db } from "./src/db/client.js";

async function verify() {
    console.log("Checking extensions table...");
    const extensions = await db`SELECT id, user_id, last_seen FROM extensions`;
    console.table(extensions);

    console.log("\nChecking commands table...");
    const commands = await db`SELECT id, device_id, command_type, status FROM commands`;
    console.table(commands);

    await db.end();
}

verify();
