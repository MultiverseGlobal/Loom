import { NextResponse } from 'next/server';

export async function POST() {
    const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

    try {
        // In a real scenario, we would send file content. 
        // For now, we send a dummy request to trigger the backend's scan on its local context or just to test connection.
        // Ideally, frontend should zip up files or send a list. 
        // For this "SaaS MVP", let's assume the backend has access or we send a sample.

        const response = await fetch(`${GATEWAY_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                files: [
                    { name: "sample.ts", content: "console.log('hello world')" }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Analysis Proxy Failed:", error);
        // Fallback to mock data if backend fails/key missing, so demo still works
        return NextResponse.json({
            issues: [
                { id: 1, type: "warning", message: "Real Analysis Failed (Check API Key)", detail: error.message },
                { id: 2, type: "info", message: "Fallback Mode Active", detail: "Using simulated data" }
            ],
            score: 50,
        });
    }
}
