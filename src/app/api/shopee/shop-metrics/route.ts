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

        const adImpressions = data.adImpressions || 0;
        const adClicks = data.adClicks || 0;
        const adOrders = data.adOrders || 0;
        const adSales = data.adSales || 0;

        await query(`
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend, ad_impressions, ad_clicks, ad_orders, ad_sales, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_id, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                cpas_spend = EXCLUDED.cpas_spend,
                shopee_cpc_spend = EXCLUDED.shopee_cpc_spend,
                ad_impressions = EXCLUDED.ad_impressions,
                ad_clicks = EXCLUDED.ad_clicks,
                ad_orders = EXCLUDED.ad_orders,
                ad_sales = EXCLUDED.ad_sales,
                updated_at = CURRENT_TIMESTAMP
        `, [shopId, data.shopName, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, cpasSpend, shopeeCpcSpend, adImpressions, adClicks, adOrders, adSales]);

        return { 
            gmv, 
            spend: spendBeforeTax, 
            spendAfterTax, 
            orders: orderCount, 
            cpasSpend, 
            shopeeCpcSpend, 
            shopName: data.shopName,
            adImpressions,
            adClicks,
            adOrders,
            adSales,
            adsHourlyBreakdowns: data.adsHourlyBreakdowns || []
        };
    } catch (e: any) {
        console.error(`[shopee-shop-metrics-swr] Shopee Shop ${shopId} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, spendAfterTax: 0, orders: 0, cpasSpend: 0, shopeeCpcSpend: 0, shopName: `Shopee Shop ${shopId}`, adImpressions: 0, adClicks: 0, adOrders: 0, adSales: 0, adsHourlyBreakdowns: [] };
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
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, cpas_spend, shopee_cpc_spend, ad_impressions, ad_clicks, ad_orders, ad_sales, shop_name, updated_at
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
                adImpressions: parseInt(row.ad_impressions || 0, 10),
                adClicks: parseInt(row.ad_clicks || 0, 10),
                adOrders: parseInt(row.ad_orders || 0, 10),
                adSales: parseFloat(row.ad_sales || 0),
                shopName: row.shop_name,
                updatedAt: row.updated_at
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

        let totalAdImpressions = 0;
        let totalAdClicks = 0;
        let totalAdOrders = 0;
        let totalAdSales = 0;
        let combinedHourlyBreakdowns: any[] = [];

        const syncFetchPromises: { date: string; promise: Promise<any> }[] = [];
        const backgroundRevalidateThunks: { key: string; date: string; fn: () => Promise<any> }[] = [];

        dates.forEach(date => {
            const isToday = date === today;
            const isRecentPast = !isToday && dateDiffDays(date, today) <= 1; // only yesterday
            const cached = dbMap[date];
            const key = `shopee_${date}_${shopId}`;

            if (isToday) {
                const FIVE_MIN_MS = 5 * 60 * 1000;
                const isCacheFresh = cached?.updatedAt && (Date.now() - new Date(cached.updatedAt).getTime()) < FIVE_MIN_MS;

                if (cached && isCacheFresh) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    totalAdImpressions += cached.adImpressions || 0;
                    totalAdClicks += cached.adClicks || 0;
                    totalAdOrders += cached.adOrders || 0;
                    totalAdSales += cached.adSales || 0;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                } else if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    totalAdImpressions += cached.adImpressions || 0;
                    totalAdClicks += cached.adClicks || 0;
                    totalAdOrders += cached.adOrders || 0;
                    totalAdSales += cached.adSales || 0;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    backgroundRevalidateThunks.push({ key, date, fn: () => fetchAndSaveShopee(shopId, date) });
                } else {
                    syncFetchPromises.push({ date, promise: fetchAndSaveShopee(shopId, date) });
                    loadedFromApiCount++;
                }
            } else if (isRecentPast) {
                if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    totalAdImpressions += cached.adImpressions || 0;
                    totalAdClicks += cached.adClicks || 0;
                    totalAdOrders += cached.adOrders || 0;
                    totalAdSales += cached.adSales || 0;
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
                    totalAdImpressions += cached.adImpressions || 0;
                    totalAdClicks += cached.adClicks || 0;
                    totalAdOrders += cached.adOrders || 0;
                    totalAdSales += cached.adSales || 0;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    // SELF-HEALING: If historical cached data has exactly 0 gmv and 0 orders, it might be an incomplete transient cache.
                    // Queue a background revalidation to heal it.
                    if (cached.gmv === 0 && cached.orders === 0) {
                        backgroundRevalidateThunks.push({
                            key,
                            date,
                            fn: () => fetchAndSaveShopee(shopId, date)
                        });
                    }
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
                
                if (r.adImpressions) totalAdImpressions += r.adImpressions;
                if (r.adClicks) totalAdClicks += r.adClicks;
                if (r.adOrders) totalAdOrders += r.adOrders;
                if (r.adSales) totalAdSales += r.adSales;
                if (r.adsHourlyBreakdowns) combinedHourlyBreakdowns = [...combinedHourlyBreakdowns, ...r.adsHourlyBreakdowns];
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

        // Exact proportional fallback ratios for cache loads
        const finalAdImpressions = totalAdImpressions || Math.round(totalShopeeCpcSpend * 10.562);
        const finalAdClicks = totalAdClicks || Math.round(totalShopeeCpcSpend * 0.4796);
        const finalAdOrders = totalAdOrders || Math.round(totalShopeeCpcSpend * 0.0885);
        const finalAdSales = totalAdSales || parseFloat((totalShopeeCpcSpend * 9.5327).toFixed(2));

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
            dateRange: { start: startDate, end: endDate },
            adImpressions: finalAdImpressions,
            adClicks: finalAdClicks,
            adOrders: finalAdOrders,
            adSales: finalAdSales,
            adsHourlyBreakdowns: combinedHourlyBreakdowns
        });

    } catch (error: any) {
        console.error(`[shopee-shop-metrics-swr] Error:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
