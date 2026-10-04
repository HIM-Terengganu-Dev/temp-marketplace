import { NextResponse } from 'next/server';
import { getTablePreview } from '@/lib/external-systems';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const system = searchParams.get('system');
        const table = searchParams.get('table');
        const limit = parseInt(searchParams.get('limit') || '25', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        if (!system || !table) {
            return NextResponse.json({ error: 'system and table query parameters are required' }, { status: 400 });
        }

        const preview = await getTablePreview(system, table, Math.min(limit, 100), Math.max(offset, 0));
        return NextResponse.json({ success: true, ...preview });
    } catch (error: any) {
        console.error('[api/external-systems/preview] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
