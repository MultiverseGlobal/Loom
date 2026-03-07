
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanup() {
    console.log('Running cleanup with direct postgres client...');
    // Force SSL and ignore prepared statements for Supabase pooler compatibility
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const sessions = await sql`DELETE FROM pairing_sessions RETURNING id`;
        console.log(`Deleted ${sessions.length} pairing sessions.`);

        const extensions = await sql`DELETE FROM extensions RETURNING id`;
        console.log(`Deleted ${extensions.length} extensions.`);

        console.log('✅ Success!');
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

cleanup();
