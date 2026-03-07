import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const pass = 'EuiVAv6YRoOPwLu9';
const projectRef = 'letfzsvorhlarfuzxijk';
const hostDirect = `db.${projectRef}.supabase.co`;
const hostPooler = 'aws-0-eu-central-1.pooler.supabase.com';

const configs = [
    {
        name: 'Direct Connection (Port 5432)',
        uri: `postgresql://postgres:${pass}@${hostDirect}:5432/postgres?sslmode=require`
    },
    {
        name: 'Pooler - Transaction Mode (Port 6543)',
        uri: `postgresql://postgres.${projectRef}:${pass}@${hostPooler}:6543/postgres?pgbouncer=true&sslmode=require`
    },
    {
        name: 'Pooler - Session Mode (Port 5432)',
        uri: `postgresql://postgres.${projectRef}:${pass}@${hostPooler}:5432/postgres?sslmode=require`
    }
];

async function runTests() {
    console.log('--- Database Connection Diagnostics ---');
    for (const config of configs) {
        console.log(`\nTesting: ${config.name}`);
        // console.log(`URI: ${config.uri.replace(pass, '****')}`);

        const sql = postgres(config.uri, {
            connect_timeout: 10,
            onnotice: () => { }
        });

        try {
            const result = await sql`SELECT 1 as connected`;
            console.log(`✅ SUCCESS: ${config.name}`);
        } catch (err: any) {
            console.log(`❌ FAILED: ${config.name}`);
            console.log(`   Error: ${err.message || err}`);
            if (err.detail) console.log(`   Detail: ${err.detail}`);
            if (err.hint) console.log(`   Hint: ${err.hint}`);
            if (err.code) console.log(`   Code: ${err.code}`);
        } finally {
            await sql.end();
        }
    }
    console.log('\n--- Diagnostics Complete ---');
}

runTests();
