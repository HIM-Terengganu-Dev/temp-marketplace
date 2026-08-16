import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { performRecheckSync } from '@/app/api/cron/recheck/route';

/**
 * Internal endpoint for the recheck trigger.
 * Authenticated dashboard users can trigger a data recheck directly.
 *
 * GET /api/internal/recheck?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&force=true|false
 *
 * Auth: requires a valid NextAuth session (must be logged in).
 */
export async function GET(request: Request) {
    // Verify the user is logged in
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized: must be logged in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate   = searchParams.get('endDate')   || undefined;
    const force     = searchParams.get('force') === 'true';

    try {
        const summary = await performRecheckSync({
            startDate,
            endDate,
            forceResync: force
        });
        const hasFailures = summary.failed > 0;
        return NextResponse.json(summary, { status: hasFailures ? 207 : 200 });
    } catch (e: any) {
        console.error('[internal/recheck] Recheck execution failed:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
