import postgres from 'postgres';

async function test() {
    const projectRef = 'letfzsvorhlarfuzxijk';
    const passes = ['THEOONIM1314', 'theoonim1314', 'Theoonim1314', 'THE00NIM1314', 'the00nim1314'];
    const hosts = [
        'aws-1-eu-west-1.pooler.supabase.com',
        'aws-0-eu-west-1.pooler.supabase.com',
        'eu-west-1-pooler.supabase.com' // variation
    ];

    for (const host of hosts) {
        for (const pass of passes) {
            console.log(`Testing ${host} with ${pass}...`);
            const uri = `postgresql://postgres.${projectRef}:${pass}@${host}:6543/postgres?sslmode=require&pgbouncer=true`;
            const sql = postgres(uri, { connect_timeout: 4 });
            try {
                await sql`SELECT 1 as ok`;
                console.log(`✅ SUCCESS! Host: ${host}, Pass: ${pass}`);
                process.exit(0);
            } catch (e: any) {
                console.log(`❌ FAIL ${host} / ${pass}: ${e.message.substring(0, 50)}`);
            } finally {
                await sql.end();
            }
        }
    }
}

test();
