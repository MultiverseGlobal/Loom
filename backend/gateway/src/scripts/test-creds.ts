import postgres from 'postgres';

async function test() {
    const passwords = ['THEOONIM1314', 'theoonim1314'];
    const regions = [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
        'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1'
    ];

    for (let region of regions) {
        for (let pass of passwords) {
            const host = `aws-0-${region}.pooler.supabase.com`;
            const hostAlternate = `aws-1-${region}.pooler.supabase.com`;
            
            for (let h of [host, hostAlternate]) {
                console.log(`Testing ${h} with ${pass}...`);
                const uri = `postgresql://postgres.letfzsvorhlarfuzxijk:${pass}@${h}:6543/postgres?sslmode=require&pgbouncer=true`;
                const sql = postgres(uri, { connect_timeout: 3 });
                try {
                    await sql`SELECT 1 as ok`;
                    console.log(`✅ SUCCESS with host ${h} and password ${pass}`);
                    process.exit(0);
                } catch (e: any) {
                    const msg = e.message || '';
                    if (msg.includes('Tenant or user not found')) {
                        // skip
                    } else {
                        console.log(`❌ FAIL ${h}: ${msg.substring(0, 50)}`);
                    }
                } finally {
                    await sql.end();
                }
            }
        }
    }
}

test();
