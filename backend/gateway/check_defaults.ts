
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDefaults() {
    console.log('Checking default values for "commands" table...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const columns = await sql`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'commands'
    `;

        console.log('Defaults found:');
        columns.forEach(col => {
            console.log(`- ${col.column_name}: ${col.column_default}`);
        });

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

checkDefaults();
