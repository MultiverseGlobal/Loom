import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const pairingId = searchParams.get('pairing_id');

    if (!pairingId) {
        return NextResponse.json({ error: 'Missing pairing_id' }, { status: 400 });
    }

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await supabaseAdmin
            .from('pairing_sessions')
            .select('status, extension_token, expires_at')
            .eq('id', pairingId)
            .single();

        if (error || !data) {
            return NextResponse.json({ status: 'unknown' }); // Don't leak details, just say unknown
        }

        if (new Date(data.expires_at) < new Date()) {
            return NextResponse.json({ status: 'expired' });
        }

        if (data.status === 'authorized' && data.extension_token) {
            // Return the token!
            // Immediately delete or archive? 
            // For robustness, we might keep it for a short bit, but typically we want burn-after-reading.
            // But if polling misses the response, network glitch? 
            // Better to let it be "read" multiple times until expiration, or have a separate "exchanged" status.
            // For simplicity V1: just return it. The token itself is valid.
            return NextResponse.json({
                status: 'authorized',
                token: data.extension_token
            });
        }

        return NextResponse.json({ status: data.status });

    } catch (error: any) {
        return NextResponse.json({ error: 'Poll error' }, { status: 500 });
    }
}
