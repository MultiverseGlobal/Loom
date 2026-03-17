import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    if (code) {
        console.log(`[AUTH CALLBACK] Exchanging code: ${code.substring(0, 5)}...`);
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('[AUTH CALLBACK] Exchange failed:', error);
        } else {
            console.log('[AUTH CALLBACK] Exchange successful');
        }
    }

    console.log(`[AUTH CALLBACK] Redirecting to: ${next}`);
    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, request.url));
}
