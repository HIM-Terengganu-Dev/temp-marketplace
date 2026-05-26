import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/cogs/total?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&gmv=<number>
 *
 * Returns the total COGS for a given date range by joining order line items
 * with the sku_cogs catalog.
 *
 * If no SKUs are mapped, falls back to 28% of the provided GMV.
 *
 * Response:
 *   { totalCogs: number, source: "dynamic" | "fallback", mappedSkuCount: number, unmappedSkuCount: number }
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const gmvParam = parseFloat(searchParams.get('gmv') || '0');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
        }

        // Query total COGS by summing (quantity * unit_cost) for all orders in range
        // that have a mapped sku_cogs entry.
        const cogsResult = await query(`
            SELECT
                COALESCE(SUM(
                    CASE WHEN sc.is_mapped = true AND sc.cogs_cost IS NOT NULL AND sc.cogs_cost > 0
                    THEN oi.quantity * sc.cogs_cost
                    ELSE 0 END
                ), 0) AS total_cogs,
                COUNT(DISTINCT CASE WHEN sc.is_mapped = true AND sc.cogs_cost > 0 THEN oi.sku_id END) AS mapped_sku_count,
                COUNT(DISTINCT CASE WHEN sc.is_mapped = false OR sc.cogs_cost IS NULL OR sc.cogs_cost = 0 THEN oi.sku_id END) AS unmapped_sku_count
            FROM credentials.tiktok_order_items oi
            INNER JOIN credentials.tiktok_orders o
                ON o.order_id = oi.order_id
            LEFT JOIN credentials.sku_cogs sc
                ON sc.sku_id = oi.sku_id
            WHERE
                o.create_time::date >= $1::date
                AND o.create_time::date <= $2::date
                AND o.order_status NOT IN ('CANCELLED', 'REFUNDED')
        `, [startDate, endDate]);

        const row = cogsResult.rows[0];
        const totalCogs = parseFloat(row?.total_cogs || '0');
        const mappedSkuCount = parseInt(row?.mapped_sku_count || '0', 10);

        // Determine source mode
        if (totalCogs > 0) {
            return NextResponse.json({
                totalCogs,
                source: 'dynamic',
                mappedSkuCount,
                unmappedSkuCount: parseInt(row?.unmapped_sku_count || '0', 10),
            });
        }

        // No mapped COGS data found — fall back to 28% of GMV
        const fallbackCogs = gmvParam * 0.28;
        return NextResponse.json({
            totalCogs: fallbackCogs,
            source: 'fallback',
            mappedSkuCount: 0,
            unmappedSkuCount: 0,
        });

    } catch (e: any) {
        console.error('[COGS Total API Error]:', e.message);
        // On DB error, fall back to 28% of GMV
        const gmvParam = parseFloat(new URL(request.url).searchParams.get('gmv') || '0');
        return NextResponse.json({
            totalCogs: gmvParam * 0.28,
            source: 'fallback',
            mappedSkuCount: 0,
            unmappedSkuCount: 0,
        });
    }
}
