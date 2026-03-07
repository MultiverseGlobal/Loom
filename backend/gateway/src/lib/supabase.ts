import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Use service role key for backend operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Database types
export interface User {
    id: string;
    clerk_user_id: string;
    email: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    user_id: string;
    name: string;
    framework: string;
    status: 'processing' | 'ready' | 'failed';
    source_type: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Job {
    id: string;
    project_id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result: Record<string, any> | null;
    error: string | null;
    created_at: string;
    updated_at: string;
}
