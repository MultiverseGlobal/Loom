import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';
const host = 'aws-0-us-east-1.pooler.supabase.com';

async function testAll() {
    const combinations = [
        { port: 6543, user: `postgres.${projectRef}` },
        { port: 6543, user: 'postgres' },
        { port: 5432, user: `postgres.${projectRef}` },
        { port: 5432, user: 'postgres' }
    ];

    for (const combo of combinations) {
        console.log(`--- Testing Port: ${combo.port}, User: ${combo.user} ---`);
        const sql = postgres({
            host,
            port: combo.port,
            user: combo.user,
            pass,
            database: 'postgres',
            ssl: 'require',
            prepare: false,
            connect_timeout: 5
        });

        try {
            const res = await sql`SELECT 1 as ok`;
            console.log(`✅ SUCCESS! Combo worked.`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        } finally {
            await sql.end();
        }
    }
}

testAll();
