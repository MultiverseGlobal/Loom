import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1'
];

async function findRegion() {
    console.log(`--- Exhaustive Search for Project: ${projectRef} ---`);
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const uri = `postgresql://postgres.${projectRef}:${pass}@${host}:6543/postgres?pgbouncer=true&sslmode=require`;

        const sql = postgres(uri, { connect_timeout: 4, prepare: false });
        try {
            await sql`SELECT 1`;
            console.log(`✅ SUCCESS IN ${region}!!`);
            console.log(`Connection URL: ${uri}`);
            process.exit(0);
        } catch (err: any) {
            const msg = err.message || '';
            const code = err.code || '';

            if (msg.includes('Tenant or user not found')) {
                // Not here
            } else if (msg.includes('password authentication failed') || msg.includes('authentication failed')) {
                console.log(`🟡 FOUND TENANT IN ${region} (but password failed)`);
            } else if (msg.includes('timeout')) {
                // console.log(`- ${region}: timeout`);
            } else {
                console.log(`? ${region}: [${code}] ${msg.substring(0, 100)}`);
            }
        } finally {
            await sql.end();
        }
    }
    console.log('--- Search Finished. No matching tenant found. ---');
    process.exit(1);
}

findRegion();
