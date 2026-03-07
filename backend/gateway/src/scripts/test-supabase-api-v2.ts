import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testApi() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    try {
        console.log('1. Checking Project Info via Auth...');
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('   Auth Error:', authError.message);
        } else {
            console.log(`   SUCCESS: Found ${authData.users.length} users in Auth.`);
        }

        console.log('2. Querying Database via REST...');
        const { data: dbData, error: dbError, count } = await supabase
            .from('users')
            .select('*', { count: 'exact' });

        if (dbError) {
            console.error('   REST DB Error:', dbError.message);
        } else {
            console.log(`   SUCCESS: Found ${count} rows in users table.`);
            if (dbData && dbData.length > 0) {
                console.log('   Sample User ID:', dbData[0].id);
            }
        }
    } catch (err: any) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testApi();
