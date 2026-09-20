import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint path is required.' }, { status: 400 });
        }

        // Clean endpoint path
        let cleanEndpoint = endpoint.trim().replace(/^\/+/, '');
        const separator = cleanEndpoint.includes('?') ? '&' : '?';
        const targetUrl = `https://graph.facebook.com/v19.0/${cleanEndpoint}${separator}access_token=${token}`;

        const start = Date.now();
        const response = await axios.get(targetUrl);
        const duration = Date.now() - start;

        return NextResponse.json({
            success: true,
            status: response.status,
            statusText: response.statusText,
            durationMs: duration,
            endpoint: cleanEndpoint,
            data: response.data
        });
    } catch (error: any) {
        console.error('Test Field Meta Raw Query Error:', error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            error: error.response?.data?.error?.message || error.message || 'Raw query execution failed.',
            details: error.response?.data || null
        }, { status: error.response?.status || 500 });
    }
}
