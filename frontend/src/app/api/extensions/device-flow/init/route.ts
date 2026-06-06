
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const body = await request.json();
        const { machine_info, device_id } = body; // device_id is optional if we let DB generate UUID, but good to have persistent ID from ext

        if (!machine_info) {
            return NextResponse.json({ error: 'Missing machine_info' }, { status: 400 });
        }

        // Create a new pairing session
        // Expires in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // We use a generated UUID for the pairing ID (the token in the URL)
        // We expect the extension to send a persistent device_id if available, or we store it for reference
        const { data, error } = await supabaseAdmin
            .from('pairing_sessions')
            .insert({
                device_id: device_id || 'unknown',
                machine_info,
                status: 'pending',
                expires_at: expiresAt
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create pairing session:', error);
            return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
        }

        const pairingId = data.id;
        // URL to open on the client
        // We assume the frontend is running at the same origin as this API
        // Need to determine base URL. In Vercel, usage process.env.NEXT_PUBLIC_APP_URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const verificationUri = `${baseUrl}/onboarding/connect?token=${pairingId}`;

        return NextResponse.json({
            pairing_id: pairingId,
            expires_in: 600,
            verification_uri_complete: verificationUri
        });

    } catch (error: any) {
        console.error('Init error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
