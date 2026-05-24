import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
        }

        // The Postgres server runs in Asia/Kuala_Lumpur timezone, so pg.js stores
        // timestamp-without-timezone values as KL local time. start_time::date therefore
        // directly extracts the correct KL date — no AT TIME ZONE conversion needed.
        // The previous double-conversion (AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/KL') was
        // incorrectly shifting all times forward by +8h, pulling May 22 sessions into May 23 results.
        console.log(`[API] Querying livestream performance for KL dates ${startDate} to ${endDate}...`);
        const result = await query(`
            SELECT 
                shop_number, 
                live_id, 
                live_title, 
                start_time, 
                end_time, 
                order_count, 
                gmv, 
                viewer_count,
                updated_at
            FROM credentials.shop_livestream_performance
            WHERE start_time::date >= $1::date
              AND start_time::date <= $2::date
            ORDER BY order_count DESC
            LIMIT 50;
        `, [startDate, endDate]);

        // Aggregate stats across all livestreams in range
        const totalStreams = result.rows.length;
        const totalGMV = result.rows.reduce((sum, row) => sum + parseFloat(row.gmv || '0'), 0);
        const totalOrders = result.rows.reduce((sum, row) => sum + parseInt(row.order_count || '0', 10), 0);
        const totalViewers = result.rows.reduce((sum, row) => sum + parseInt(row.viewer_count || '0', 10), 0);

        return NextResponse.json({
            success: true,
            summary: {
                totalStreams,
                totalGMV,
                totalOrders,
                totalViewers
            },
            leaderboard: result.rows
        });

    } catch (error: any) {
        console.error('Livestream performance API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
