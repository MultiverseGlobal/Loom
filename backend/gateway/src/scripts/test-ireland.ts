import postgres from 'postgres';

async function test() {
    console.log('--- TESTING Ireland: aws-0-eu-west-1.pooler.supabase.com, Port: 6543 ---');
    const sql = postgres({
        host: 'aws-0-eu-west-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.letfzsvorhlarfuzxijk',
        pass: 'EuiVAv6YRoOPwLu9',
        database: 'postgres',
        ssl: 'require',
        prepare: false,
        connect_timeout: 10
    });

    try {
        const res = await sql`SELECT 1 as ok`;
        console.log('✅ SUCCESS!', res);
        process.exit(0);
    } catch (err: any) {
        console.log('❌ FAILED:', err.message);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

test();
