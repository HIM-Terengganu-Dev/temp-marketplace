import { NextResponse } from 'next/server';
import { checkAllSystems } from '@/lib/external-systems';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await checkAllSystems();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...data
        });
    } catch (error: any) {
        console.error('[api/external-systems/status] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
