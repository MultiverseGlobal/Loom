import 'dotenv/config';
import postgres from 'postgres';

async function testConnection() {
    const url = process.env.DATABASE_URL;
    console.log('Testing connection to Supabase...');

    if (!url) {
        console.error('❌ DATABASE_URL is not set in environment!');
        process.exit(1);
    }

    const sql = postgres(url, {
        ssl: 'require',
        prepare: false,
        connect_timeout: 10
    });

    try {
        const result = await sql`SELECT NOW() as time, version() as version`;
        console.log('✅ Connection successful!');
        console.log('Server time:', result[0].time);
        console.log('PostgreSQL version:', result[0].version);
        await sql.end();
    } catch (error: any) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

testConnection();
