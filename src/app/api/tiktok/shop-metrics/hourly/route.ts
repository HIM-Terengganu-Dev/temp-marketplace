import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';

/**
 * Hourly GMV & Spend breakdown endpoint.
 * Fetches all orders and ads spend for a single day and buckets them into hourly slots (GMT+8).
 * Always calls the live TikTok API — no DB cache for hourly data.
 *
 * Query params:
 *   date=YYYY-MM-DD   (required)
 *   shopNumber=1-4    (required)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (!date) {
        return NextResponse.json({ error: 'Missing required parameter: date' }, { status: 400 });
    }

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}` }, { status: 400 });
    }

    try {
        // Fetch orders and ads spend for the day in parallel
        const [gmvData, roasData] = await Promise.all([
            fetchShopGMV(shopNumber, date, date),
            fetchShopROAS(shopNumber, date, date).catch((err) => {
                console.warn(`[shop-metrics/hourly] Failed to fetch ROAS for shop ${shopNumber}:`, err.message);
                return { totalAdsSpend: 0, totalCostWithTaxes: 0 };
            })
        ]);

        // Build 24 hourly buckets (00:00 – 23:00) in GMT+8
        const hourlyBuckets: { hour: string; gmv: number; orders: number; spend: number; roas: number }[] = Array.from(
            { length: 24 },
            (_, i) => ({
                hour: `${String(i).padStart(2, '0')}:00`,
                gmv: 0,
                orders: 0,
                spend: 0,
                roas: 0,
            })
        );

        // Distribute each order into its GMT+8 hour slot
        for (const order of gmvData.orders || []) {
            if (!order.isIncluded || !order.createTime) continue;

            // createTime is a Unix timestamp (seconds); convert to GMT+8 hour
            const utcMs = order.createTime * 1000;
            const gmt8Date = new Date(
                new Date(utcMs).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })
            );
            const hourIndex = gmt8Date.getHours();

            if (hourIndex >= 0 && hourIndex < 24) {
                hourlyBuckets[hourIndex].gmv += order.gmv || 0;
                hourlyBuckets[hourIndex].orders += 1;
            }
        }

        const totalGMV = gmvData.gmv || 0;
        const totalSpend = roasData.totalAdsSpend || 0;

        // Distribute spend and calculate ROAS per hourly slot
        for (let i = 0; i < 24; i++) {
            let hourSpend = 0;
            if (totalGMV > 0) {
                hourSpend = (hourlyBuckets[i].gmv / totalGMV) * totalSpend;
            } else if (totalSpend > 0) {
                hourSpend = totalSpend / 24;
            }
            hourlyBuckets[i].spend = hourSpend;
            hourlyBuckets[i].roas = hourSpend > 0 ? hourlyBuckets[i].gmv / hourSpend : 0;
        }

        const shopConfig = SHOPS[shopNumberParam];

        return NextResponse.json({
            shopNumber,
            shopName: gmvData.shopName || shopConfig?.name || `Shop ${shopNumber}`,
            date,
            hourly: hourlyBuckets,
            totalGMV: gmvData.gmv,
            totalOrders: gmvData.orderCount,
            totalSpend,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[shop-metrics/hourly] Error for shop ${shopNumber} on ${date}:`, message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
