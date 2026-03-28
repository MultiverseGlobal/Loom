import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        // For MVP, skip authentication - just generate a key
        // In production, validate user session

        const body = await request.json();
        const { extensionType } = body; // 'vscode' or 'cursor'

        // Generate API key
        const apiKey = `shift_${randomBytes(32).toString('hex')}`;

        // Store in database (we'll need to create this table)
        // For MVP, just return the key

        return NextResponse.json({
            apiKey,
            extensionType,
            message: 'API key generated successfully'
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        return NextResponse.json(
            { error: 'Failed to generate API key' },
            { status: 500 }
        );
    }
}
