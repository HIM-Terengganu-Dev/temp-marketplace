import { NextResponse } from 'next/server';
import { fetchShopeeShopPerformance } from '@/lib/shopee-client';

export const dynamic = 'force-dynamic';

/**
 * Hourly GMV & Spend breakdown endpoint for Shopee.
 * Features in-memory TTL caching and in-flight request deduplication to prevent rate limits.
 */

interface CacheEntry {
    data: any;
    expiresAt: number;
}

const hourlyCache = new Map<string, CacheEntry>();
const inFlightPromises = new Map<string, Promise<any>>();

function getKLToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

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

    const cacheKey = `shp_hourly_${shopId}_${date}`;
    const now = Date.now();

    // 1. Return from memory cache if valid
    const cached = hourlyCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
        return NextResponse.json(cached.data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'X-Cache': 'HIT',
            }
        });
    }

    // 2. Reuse in-flight request if already pending
    if (inFlightPromises.has(cacheKey)) {
        try {
            const data = await inFlightPromises.get(cacheKey)!;
            return NextResponse.json(data, {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                    'X-Cache': 'COALESCED',
                }
            });
        } catch {
            // Fall through to retry on error
        }
    }

    const fetchPromise = (async () => {
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

        const payload = {
            shopId,
            shopName: data.shopName,
            date,
            hourly: hourlyBuckets,
            totalGMV: data.gmv,
            totalOrders: data.orderCount,
            totalSpend: data.spendBeforeTax,
        };

        // Cache TTL: 5 min for today, 1 hour for past dates
        const isToday = date === getKLToday();
        const ttlMs = isToday ? 5 * 60 * 1000 : 60 * 60 * 1000;
        hourlyCache.set(cacheKey, { data: payload, expiresAt: Date.now() + ttlMs });

        return payload;
    })();

    inFlightPromises.set(cacheKey, fetchPromise);

    try {
        const data = await fetchPromise;
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'X-Cache': 'MISS',
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[shopee-metrics/hourly] Error for shop ${shopId} on ${date}:`, message);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        inFlightPromises.delete(cacheKey);
    }
}
