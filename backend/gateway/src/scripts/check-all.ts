import '../env.js';
import { db } from './db/client.js';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

async function runCheck() {
    console.error('--- DIAGNOSTIC START ---');
    console.error('CWD:', process.cwd());
    console.error('SUPABASE_URL:', config.supabaseUrl);
    console.error('DATABASE_URL starts with:', config.databaseUrl.substring(0, 30) + '...');

    try {
        console.error('1. Testing Database Connection...');
        const res = await db`SELECT 1 as connected`;
        console.error('   DB Result:', res[0]);
        console.error('   SUCCESS: Database is reachable.');
    } catch (err: any) {
        console.error('   FAILED: Database error:', err.message, err.code, err.severity);
    }

    try {
        console.error('2. Testing Auth Client...');
        const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        const { data, error } = await supabase.auth.getSession();
        console.error('   Auth Result:', error ? `ERROR: ${error.message}` : 'SUCCESS (Session exists: ' + !!data.session + ')');
    } catch (err: any) {
        console.error('   FAILED: Auth client error:', err.message);
    }

    try {
        console.error('3. Checking Tables...');
        const tables = await db`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.error('   Tables found:', tables.map(t => (t as any).table_name).join(', '));
    } catch (err: any) {
        console.error('   FAILED: Table check error:', err.message);
    }

    console.error('--- DIAGNOSTIC END ---');
    process.exit(0);
}

runCheck();
