import { NextResponse } from 'next/server';
import { fetchShopeeShopPerformance } from '@/lib/shopee-client';

/**
 * Hourly GMV & Spend breakdown endpoint for Shopee.
 * Fetches all orders and CPC ad spends for a single day and buckets them into 24 hourly slots (GMT+8).
 *
 * Query params:
 *   date=YYYY-MM-DD   (required)
 *   shopId=12345      (required)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopIdParam = searchParams.get('shopId');

    if (!date || !shopIdParam) {
        return NextResponse.json({ error: 'Missing required parameters: date, shopId' }, { status: 400 });
    }

    const shopId = parseInt(shopIdParam, 10);
    if (isNaN(shopId)) {
        return NextResponse.json({ error: `Invalid shop ID: ${shopIdParam}` }, { status: 400 });
    }

    try {
        // Fetch performance details for the single day
        const data = await fetchShopeeShopPerformance(shopId, date, date);

        // Build 24 hourly buckets (00:00 – 23:00) in GMT+8
        const hourlyBuckets = Array.from(
            { length: 24 },
            (_, i) => ({
                hour: `${String(i).padStart(2, '0')}:00`,
                gmv: 0,
                orders: 0,
                spend: 0,
                roas: 0,
            })
        );

        // 1. Distribute each order into its GMT+8 hour slot
        for (const order of data.orders || []) {
            if (!order.isIncluded || !order.createTime) continue;

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

        // 2. Distribute CPC ad spend hourly breakdown
        const hourlySpend = data.adsHourlyBreakdowns?.[0]?.hourlySpend || Array.from({ length: 24 }, () => 0);
        for (let i = 0; i < 24; i++) {
            hourlyBuckets[i].spend = hourlySpend[i];
            hourlyBuckets[i].roas = hourlySpend[i] > 0 ? hourlyBuckets[i].gmv / hourlySpend[i] : 0;
        }

        return NextResponse.json({
            shopId,
            shopName: data.shopName,
            date,
            hourly: hourlyBuckets,
            totalGMV: data.gmv,
            totalOrders: data.orderCount,
            totalSpend: data.spendBeforeTax,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[shopee-metrics/hourly] Error for shop ${shopId} on ${date}:`, message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
