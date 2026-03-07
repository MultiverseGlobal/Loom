import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';
const host = 'aws-0-us-east-1.pooler.supabase.com';

async function testUsernames() {
    const usernames = [
        `postgres.${projectRef}`,
        projectRef,
        'postgres',
        `supabase_admin.${projectRef}`
    ];

    for (const user of usernames) {
        console.log(`--- Testing Username: ${user} ---`);
        const sql = postgres({
            host,
            port: 6543,
            user,
            pass,
            database: 'postgres',
            ssl: 'require',
            prepare: false,
            connect_timeout: 10
        });

        try {
            const res = await sql`SELECT 1 as ok`;
            console.log(`✅ SUCCESS with username: ${user}`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        } finally {
            await sql.end();
        }
    }
}

testUsernames();
