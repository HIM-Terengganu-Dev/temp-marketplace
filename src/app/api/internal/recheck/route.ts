import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Internal proxy for the recheck endpoint.
 * This lets authenticated dashboard users trigger a data recheck
 * without exposing CRON_SECRET to the client.
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

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const force     = searchParams.get('force') || 'false';

    // Build the downstream URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate)   params.set('endDate', endDate);
    if (force)     params.set('force', force);

    const recheckUrl = `${baseUrl}/api/cron/recheck?${params.toString()}`;

    try {
        const res = await fetch(recheckUrl, {
            headers: { Authorization: `Bearer ${cronSecret}` }
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        console.error('[internal/recheck] Proxy call failed:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
