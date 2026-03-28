
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js'; // For admin actions
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    // 1. Verify User is Authenticated
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { pairing_id } = body;

        if (!pairing_id) {
            return NextResponse.json({ error: 'Missing pairing_id' }, { status: 400 });
        }

        // 2. Use Admin Client to Update Session
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check availability
        const { data: session, error: fetchError } = await supabaseAdmin
            .from('pairing_sessions')
            .select('*')
            .eq('id', pairing_id)
            .single();

        if (fetchError || !session) {
            return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
        }

        if (session.status !== 'pending') {
            return NextResponse.json({ error: `Session is ${session.status}` }, { status: 409 });
        }

        // 3. Register Extension & Generate Token
        const extensionToken = `shiftext_${randomUUID().replace(/-/g, '')}`;

        // Create Extension Record
        const { error: extError } = await supabaseAdmin
            .from('extensions')
            .insert({
                token: extensionToken,
                user_id: user.id,
                machine_info: session.machine_info,
                last_seen: new Date().toISOString()
            });

        if (extError) {
            throw new Error(`Failed to register extension: ${extError.message}`);
        }

        // 4. Update Pairing Session
        const { error: updateError } = await supabaseAdmin
            .from('pairing_sessions')
            .update({
                status: 'authorized',
                user_id: user.id,
                extension_token: extensionToken
            })
            .eq('id', pairing_id);

        if (updateError) {
            throw new Error(`Failed to update session: ${updateError.message}`);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Authorize error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
