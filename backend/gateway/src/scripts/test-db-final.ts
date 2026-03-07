import 'dotenv/config';
import postgres from 'postgres';
import { config } from './config.js';

async function testConnection() {
    console.error('Testing connection to:', config.databaseUrl.replace(/:[^:]+@/, ':****@'));
    const sql = postgres(config.databaseUrl, {
        prepare: false,
        connect_timeout: 10
    });

    try {
        const result = await sql`SELECT 1 as connected`;
        console.error('✅ Database Connection Successful:', result);
    } catch (err: any) {
        console.error('❌ Database Connection Failed!');
        console.error('Error Message:', err.message);
        console.error('Error Code:', err.code);
        console.error('Severity:', err.severity);
        console.error('Full Error:', JSON.stringify(err, null, 2));
    } finally {
        await sql.end();
    }
}

testConnection();
