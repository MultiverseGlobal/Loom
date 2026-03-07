import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        // Get API key from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const apiKey = authHeader.replace('Bearer ', '');

        // For MVP, we'll skip API key validation and just return all pending projects
        // TODO: Implement proper API key validation with extension_connections table

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch projects with github_url that haven't been imported yet
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, source, github_url, created_at')
            .not('github_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch projects' },
                { status: 500 }
            );
        }

        // Transform to match extension interface
        const pendingProjects = projects?.map((p: any) => ({
            id: p.id,
            name: p.name,
            platform: p.source,
            repoUrl: p.github_url,
            createdAt: p.created_at
        })) || [];

        return NextResponse.json({
            projects: pendingProjects
        });

    } catch (error) {
        console.error('Error fetching pending projects:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
