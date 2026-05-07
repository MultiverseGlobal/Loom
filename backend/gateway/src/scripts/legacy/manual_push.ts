
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const USER_ID = '3f3e183a-b144-4882-9014-ea5aa1a2d585';

async function manualPush() {
    console.log('Starting manual push...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        // 1. Get Project
        const [project] = await sql`
      SELECT * FROM projects 
      WHERE user_id = ${USER_ID} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

        if (!project) throw new Error("No project found for user");
        console.log(`Targeting Project: ${project.name} (${project.id})`);

        // 2. Get Device
        const [device] = await sql`
      SELECT * FROM extensions 
      WHERE user_id = ${USER_ID} 
      ORDER BY last_seen DESC 
      LIMIT 1
    `;

        if (!device) throw new Error("No device found for user");
        console.log(`Targeting Device: ${device.id} (Online: ${new Date().getTime() - new Date(device.last_seen).getTime() < 30000})`);

        // 3. Create Command
        const payload = {
            projectId: project.id,
            projectName: project.name,
            sourceUrl: project.source_url || project.github_url || `https://github.com/placeholder/${project.name}.git`,
            branch: 'main',
            upg: true // Universal Project (no git)
        };

        const [cmd] = await sql`
        INSERT INTO commands (user_id, device_id, command_type, project_id, payload, priority, status)
        VALUES (${USER_ID}, ${device.id}, 'IMPORT_PROJECT', ${project.id}, ${JSON.stringify(payload)}, 10, 'pending')
        RETURNING id
    `;

        console.log(`✅ Command created successfully! ID: ${cmd.id}`);

    } catch (err) {
        console.error('❌ Push failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

manualPush();
