const postgres = require('postgres');

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1'
];

async function findRegion() {
    console.log(`Searching for region of: ${projectRef}`);
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const uri = `postgresql://postgres.${projectRef}:${pass}@${host}:6543/postgres?pgbouncer=true&sslmode=require`;

        const sql = postgres(uri, { connect_timeout: 3 });
        try {
            await sql`SELECT 1`;
            console.log(`✅ FOUND: ${region} (${host})`);
            process.exit(0);
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('Tenant or user not found')) {
                // Not here
            } else if (msg.includes('password authentication failed') || msg.includes('authentication failed')) {
                console.log(`✅ FOUND REGION (Auth failed but tenant found): ${region}`);
                process.exit(0);
            } else {
                console.log(`? ${region}: ${msg.substring(0, 50)}`);
            }
        } finally {
            await sql.end();
        }
    }
    console.log('Search complete. No region found.');
}

findRegion();
