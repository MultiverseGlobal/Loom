import postgres from 'postgres';

async function test() {
    console.log('--- TESTING Project Host: letfzsvorhlarfuzxijk.supabase.co, Port: 6543 ---');
    const sql = postgres({
        host: 'letfzsvorhlarfuzxijk.supabase.co',
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
