import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
    'sa-east-1', 'ca-central-1'
];

async function findRegion() {
    console.log(`--- Testing Session Poolers (Port 5432) ---`);
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const uri = `postgresql://postgres:${pass}@${host}:5432/postgres?sslmode=require`;

        console.log(`Testing: ${region} (${host})`);
        const sql = postgres(uri, { connect_timeout: 4 });
        try {
            await sql`SELECT 1 as connected`;
            console.log(`✅ SUCCESS! Project is in ${region} using Session Pooler.`);
            process.exit(0);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Tenant or user not found')) {
                // Not this region
            } else if (msg.includes('password authentication failed') || msg.includes('authentication failed')) {
                console.log(`✅ FOUND REGION: ${region} (but password failed)`);
                process.exit(1);
            } else {
                console.log(`- ${region}: ${msg.substring(0, 50)}`);
            }
        } finally {
            await sql.end();
        }
    }
    console.log('\n--- Done. ---');
}

findRegion();
