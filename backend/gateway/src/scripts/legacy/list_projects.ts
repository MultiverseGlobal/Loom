
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const USER_ID = '3f3e183a-b144-4882-9014-ea5aa1a2d585';

async function listUserProjects() {
    console.log(`Listing projects for user ${USER_ID}...`);
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const projects = await sql`
      SELECT id, name, status, source_url 
      FROM projects 
      WHERE user_id = ${USER_ID}
      ORDER BY created_at DESC
    `;

        console.log(`Found ${projects.length} projects:`);
        projects.forEach(p => {
            console.log(`- [${p.id}] ${p.name} (${p.status})`);
        });

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

listUserProjects();
