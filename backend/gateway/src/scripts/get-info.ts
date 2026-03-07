import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getProjectInfo() {
    console.log('Fetching project info from:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Try to fetch something that might reveal metadata
        const { data, error } = await supabase.from('_settings').select('*').limit(1);
        console.log('Data:', data);
        console.log('Error:', error);
    } catch (err) {
        console.error('Failed to fetch:', err);
    }
}

getProjectInfo();
