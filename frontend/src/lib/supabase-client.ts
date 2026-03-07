import { createBrowserClient } from '@supabase/ssr';

/*
 * Client-side Supabase client for Client Components
 * Uses @supabase/ssr for proper cookie handling
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// Deprecated: useSupabaseClient for backward compatibility if needed, but direct createClient is preferred
export const useSupabaseClient = createClient;
