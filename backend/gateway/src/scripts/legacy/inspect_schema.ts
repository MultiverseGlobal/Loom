
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function inspectSchema() {
    console.log('Inspecting "commands" table schema...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'commands'
    `;

        console.log('Columns found:');
        columns.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type}) [Null: ${col.is_nullable}]`);
        });

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

inspectSchema();
