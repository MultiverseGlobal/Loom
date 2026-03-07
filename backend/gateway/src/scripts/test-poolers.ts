import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';
const host = 'aws-0-us-east-1.pooler.supabase.com';

async function testPoolers() {
    const ports = [6543, 6544];
    for (const port of ports) {
        console.log(`--- Testing Port: ${port} ---`);
        const sql = postgres({
            host,
            port,
            user: `postgres.${projectRef}`,
            pass,
            database: 'postgres',
            ssl: 'require',
            prepare: false,
            connect_timeout: 10
        });

        try {
            const res = await sql`SELECT 1 as ok`;
            console.log(`✅ SUCCESS on port ${port}!`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        } finally {
            await sql.end();
        }
    }
}

testPoolers();
