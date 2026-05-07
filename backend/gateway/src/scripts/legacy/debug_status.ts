
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkStatus() {
    console.log('Checking extension status...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const extensions = await sql`
      SELECT id, user_id, last_seen, NOW() as server_time, 
      (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM last_seen)) as seconds_ago 
      FROM extensions
    `;

        console.log('Current Extensions:');
        extensions.forEach(ext => {
            console.log('------------------------------------------------');
            console.log(`ID: ${ext.id}`);
            console.log(`User: ${ext.user_id}`);
            console.log(`Last Seen: ${ext.last_seen}`);
            console.log(`Server Time: ${ext.server_time}`);
            console.log(`Seconds Ago: ${ext.seconds_ago}`);
            console.log(`Status should be: ${ext.seconds_ago < 30 ? 'ONLINE' : 'OFFLINE'}`);
        });

        if (extensions.length === 0) {
            console.log('No extensions found in DB.');
        }

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

checkStatus();
