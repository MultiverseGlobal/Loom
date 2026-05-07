
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function repair() {
    console.log('Repairing extension status...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const result = await sql`
      UPDATE extensions 
      SET last_seen = NOW() 
      WHERE last_seen IS NULL
      RETURNING *
    `;

        console.log(`Repaired ${result.length} extensions.`);
        result.forEach(r => console.log(`Fixed ID: ${r.id}`));

    } catch (err) {
        console.error('❌ Repair failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

repair();
