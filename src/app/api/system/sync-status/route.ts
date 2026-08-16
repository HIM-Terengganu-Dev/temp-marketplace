import { NextResponse } from 'next/server';
import { getSystemSyncStatus, recordSyncEvent } from '@/lib/sync-tracker';

export async function GET() {
    try {
        const status = await getSystemSyncStatus();
        return NextResponse.json(status);
    } catch (error: any) {
        console.error('[api/system/sync-status] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { source, status, meta } = body;

        if (source && ['tiktok_api', 'shopee_api', 'tiktok_db', 'shopee_db'].includes(source)) {
            await recordSyncEvent(source, status || 'success', meta);
        }

        const currentStatus = await getSystemSyncStatus();
        return NextResponse.json({ success: true, ...currentStatus });
    } catch (error: any) {
        console.error('[api/system/sync-status POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
