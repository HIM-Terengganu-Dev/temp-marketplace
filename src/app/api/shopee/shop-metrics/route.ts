import { NextResponse } from 'next/server';
import { fetchShopeeShopPerformance } from '@/lib/shopee-client';
import { query } from '@/lib/db';

function getKLToday(): string {
    const now = new Date();
    // Get current date in KL timezone (GMT+8) as a YYYY-MM-DD string
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); 
}

function dateDiffDays(dateStr: string, todayStr: string): number {
    const [dy, dm, dd] = dateStr.split('-').map(Number);
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const d1 = Date.UTC(dy, dm - 1, dd);
    const d2 = Date.UTC(ty, tm - 1, td);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    while (curr <= end) {
        const y = curr.getUTCFullYear();
        const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const d = String(curr.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
}

async function fetchAndSaveShopee(shopId: number, date: string) {
    try {
        const data = await fetchShopeeShopPerformance(shopId, date, date);

        const gmv = data.gmv || 0;
        const orderCount = data.orderCount || 0;
        const spendBeforeTax = data.spendBeforeTax || 0;
        const spendAfterTax = data.spendAfterTax || 0;
        const roasBeforeTax = data.roasBeforeTax || 0;
        const roasAfterTax = data.roasAfterTax || 0;
        const cpasSpend = data.cpasSpend || 0;
        const shopeeCpcSpend = data.shopeeCpcSpend || 0;

        await query(`
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_id, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                cpas_spend = EXCLUDED.cpas_spend,
                shopee_cpc_spend = EXCLUDED.shopee_cpc_spend,
                updated_at = CURRENT_TIMESTAMP
        `, [shopId, data.shopName, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, cpasSpend, shopeeCpcSpend]);

        return { gmv, spend: spendBeforeTax, spendAfterTax, orders: orderCount, cpasSpend, shopeeCpcSpend, shopName: data.shopName };
    } catch (e: any) {
        console.error(`[shopee-shop-metrics-swr] Shopee Shop ${shopId} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, spendAfterTax: 0, orders: 0, cpasSpend: 0, shopeeCpcSpend: 0, shopName: `Shopee Shop ${shopId}` };
    }
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shopIdParam = searchParams.get('shopId');

    if (!startDate || !endDate || !shopIdParam) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate, shopId' }, { status: 400 });
    }

    const shopId = parseInt(shopIdParam, 10);
    if (isNaN(shopId)) {
        return NextResponse.json({ error: `Invalid shop ID: ${shopIdParam}` }, { status: 400 });
    }

    try {
        const today = getKLToday();
        const dates = generateDateRange(startDate, endDate);

        // 1. Fetch bulk rows from DB for this shop and range
        const dbResult = await query(`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, cpas_spend, shopee_cpc_spend, shop_name
            FROM credentials.daily_shopee_metrics
            WHERE shop_id = $1 AND date >= $2::date AND date <= $3::date
        `, [shopId, startDate, endDate]);

        const dbMap: Record<string, any> = {};
        dbResult.rows.forEach(row => {
            dbMap[row.date] = {
                gmv: parseFloat(row.gmv),
                spend: parseFloat(row.spend_before_tax),
                spendAfterTax: parseFloat(row.spend_after_tax),
                orders: parseInt(row.order_count, 10),
                cpasSpend: parseFloat(row.cpas_spend || 0),
                shopeeCpcSpend: parseFloat(row.shopee_cpc_spend || 0),
                shopName: row.shop_name
            };
        });

        let totalGMV = 0;
        let totalSpend = 0;
        let totalSpendAfterTax = 0;
        let totalOrders = 0;
        let totalCpasSpend = 0;
        let totalShopeeCpcSpend = 0;
        let shopName = `Shopee Shop ${shopId}`;
        let loadedFromDbCount = 0;
        let loadedFromApiCount = 0;

        const syncFetchPromises: { date: string; promise: Promise<{ gmv: number; spend: number; spendAfterTax: number; orders: number; cpasSpend: number; shopeeCpcSpend: number; shopName?: string }> }[] = [];
        const backgroundRevalidateThunks: { key: string; date: string; fn: () => Promise<any> }[] = [];

        dates.forEach(date => {
            const isToday = date === today;
            const isRecentPast = !isToday && dateDiffDays(date, today) <= 3;
            const cached = dbMap[date];
            const key = `shopee_${date}_${shopId}`;

            if (isToday) {
                syncFetchPromises.push({ date, promise: fetchAndSaveShopee(shopId, date) });
                loadedFromApiCount++;
            } else if (isRecentPast) {
                if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    backgroundRevalidateThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveShopee(shopId, date)
                    });
                } else {
                    syncFetchPromises.push({ date, promise: fetchAndSaveShopee(shopId, date) });
                    loadedFromApiCount++;
                }
            } else {
                if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                } else {
                    syncFetchPromises.push({ date, promise: fetchAndSaveShopee(shopId, date) });
                    loadedFromApiCount++;
                }
            }
        });

        // Resolve synchronous fetches in parallel
        if (syncFetchPromises.length > 0) {
            console.log(`[shopee-shop-metrics-swr] Synchronously fetching ${syncFetchPromises.length} cache misses/live shop metrics...`);
            const syncResults = await Promise.all(syncFetchPromises.map(p => p.promise));
            syncResults.forEach(r => {
                totalGMV += r.gmv;
                totalSpend += r.spend;
                totalSpendAfterTax += r.spendAfterTax;
                totalOrders += r.orders;
                totalCpasSpend += r.cpasSpend;
                totalShopeeCpcSpend += r.shopeeCpcSpend;
                if (r.shopName) shopName = r.shopName;
            });
        }

        const roasBeforeTax = totalSpend > 0 ? totalGMV / totalSpend : 0;
        const roasAfterTax = totalSpendAfterTax > 0 ? totalGMV / totalSpendAfterTax : 0;

        let dataSource = 'live_api';
        if (loadedFromDbCount > 0 && loadedFromApiCount > 0) {
            dataSource = 'database+api';
        } else if (loadedFromDbCount > 0) {
            dataSource = 'database';
        }

        // Trigger background revalidations sequentially spaced by 200ms
        if (backgroundRevalidateThunks.length > 0) {
            console.log(`[shopee-shop-metrics-swr] SWR: Triggering ${backgroundRevalidateThunks.length} background revalidations sequentially...`);
            (async () => {
                try {
                    for (let i = 0; i < backgroundRevalidateThunks.length; i++) {
                        const item = backgroundRevalidateThunks[i];
                        console.log(`[shopee-shop-metrics-swr] SWR: [${i + 1}/${backgroundRevalidateThunks.length}] Revalidating ${item.key} for ${item.date}...`);
                        await item.fn();
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    console.log(`[shopee-shop-metrics-swr] SWR: Background revalidation completed successfully`);
                } catch (e: any) {
                    console.error('[shopee-shop-metrics-swr] SWR: Background revalidation error:', e.message);
                }
            })();
        }

        return NextResponse.json({
            shopId,
            shopName,
            gmv: totalGMV,
            orderCount: totalOrders,
            totalAdsSpend: totalSpend,
            totalCostWithTaxes: totalSpendAfterTax,
            cpasSpend: totalCpasSpend,
            shopeeCpcSpend: totalShopeeCpcSpend,
            sst: totalSpend * 0.08,
            wht: totalSpend * 0.08,
            roasBeforeTax,
            roasAfterTax,
            dataSource,
            dateRange: { start: startDate, end: endDate }
        });


    } catch (error: any) {
        console.error(`[shopee-shop-metrics-swr] Error:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
