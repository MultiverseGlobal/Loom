
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listTables() {
    console.log('Listing tables...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

        console.log('Tables found:', tables.map(t => t.table_name));

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

listTables();
