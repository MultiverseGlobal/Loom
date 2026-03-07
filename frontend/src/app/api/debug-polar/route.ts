import { NextResponse } from 'next/server';

export async function GET() {
    const token = process.env.POLAR_ACCESS_TOKEN;
    return NextResponse.json({
        message: "Env Var Check",
        tokenExists: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token ? token.substring(0, 10) + "..." : "N/A",
        successUrl: process.env.POLAR_SUCCESS_URL
    });
}
