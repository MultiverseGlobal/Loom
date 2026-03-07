import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testApi() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    console.log(`Testing API for: ${url}`);
    const supabase = createClient(url, key);

    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('❌ API Error:', error.message);
            console.error('Full Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ API Connection Successful!');
            console.log('User count:', data);
        }
    } catch (err: any) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testApi();
