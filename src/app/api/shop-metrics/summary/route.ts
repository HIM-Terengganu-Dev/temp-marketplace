import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops } from '@/lib/shopee-client';
import { query } from '@/lib/db';

function getKLToday(): string {
    const now = new Date();
    // Get current date in KL timezone (GMT+8) as a YYYY-MM-DD string
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // en-CA gives YYYY-MM-DD format
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

async function fetchAndSaveTikTok(shopNumber: number, date: string) {
    try {
        const shopConfig = SHOPS[shopNumber.toString()];
        if (!shopConfig) return { gmv: 0, spend: 0, orders: 0 };

        const [gmvData, roasData] = await Promise.all([
            fetchShopGMV(shopNumber, date, date),
            fetchShopROAS(shopNumber, date, date)
        ]);

        const gmv = gmvData.gmv || 0;
        const orderCount = gmvData.orderCount || 0;
        const spendBeforeTax = roasData.totalAdsSpend || 0;
        const spendAfterTax = roasData.totalCostWithTaxes || 0;
        const roasBeforeTax = spendBeforeTax > 0 ? gmv / spendBeforeTax : 0;
        const roasAfterTax = spendAfterTax > 0 ? gmv / spendAfterTax : 0;

        const liveGMVMaxCost = roasData.liveGMVMaxCost || 0;
        const productGMVMaxCost = roasData.productGMVMaxCost || 0;
        const manualCampaignSpend = roasData.manualCampaignSpend || 0;

        await query(`
            INSERT INTO credentials.daily_shop_metrics (
                shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_number, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                live_gmv_max_cost = EXCLUDED.live_gmv_max_cost,
                product_gmv_max_cost = EXCLUDED.product_gmv_max_cost,
                manual_campaign_spend = EXCLUDED.manual_campaign_spend,
                updated_at = CURRENT_TIMESTAMP
        `, [shopNumber, gmvData.shopName || shopConfig.name, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend]);

        return { gmv, spend: spendBeforeTax, orders: orderCount, shopName: gmvData.shopName || shopConfig.name };
    } catch (e: any) {
        console.error(`[summary] TikTok Shop ${shopNumber} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, orders: 0 };
    }
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

        return { gmv, spend: spendBeforeTax, orders: orderCount, cpasSpend, shopeeCpcSpend, shopName: data.shopName };
    } catch (e: any) {
        console.error(`[summary] Shopee Shop ${shopId} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, orders: 0, cpasSpend: 0, shopeeCpcSpend: 0 };
    }
}


async function fetchTikTokShopMetricsSWR(
    shopNumber: number,
    startDate: string,
    endDate: string,
    today: string,
    backgroundThunks: { key: string; date: string; fn: () => Promise<any> }[]
) {
    const dates = generateDateRange(startDate, endDate);
    
    // 1. Fetch existing rows from DB for this shop and range
    const dbResult = await query(`
        SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, shop_name, updated_at
        FROM credentials.daily_shop_metrics
        WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
    `, [shopNumber, startDate, endDate]);

    const dbMap: Record<string, any> = {};
    dbResult.rows.forEach(row => {
        dbMap[row.date] = {
            gmv: parseFloat(row.gmv),
            spend: parseFloat(row.spend_before_tax),
            orders: parseInt(row.order_count, 10),
            shopName: row.shop_name,
            updatedAt: row.updated_at
        };
    });

    let totalGMV = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    const shopConfig = SHOPS[shopNumber.toString()];
    let shopName = shopConfig?.name || `Shop ${shopNumber}`;
    let loadedFromDbCount = 0;
    let loadedFromApiCount = 0;

    const syncPromises: Promise<{ gmv: number; spend: number; orders: number; shopName?: string }>[] = [];

    dates.forEach(date => {
        const isToday = date === today;
        const isRecentPast = !isToday && dateDiffDays(date, today) <= 1; // only yesterday - avoids overwriting historical corrections
        const cached = dbMap[date];
        const key = `tiktok_${date}_${shopNumber}`;

        if (isToday) {
            // Serve cache if fresh (< 5 min), else revalidate in background
            const FIVE_MIN_MS = 5 * 60 * 1000;
            const isCacheFresh = cached?.updatedAt && (Date.now() - new Date(cached.updatedAt).getTime()) < FIVE_MIN_MS;

            if (cached && isCacheFresh) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
            } else if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
                // Queue background revalidation
                backgroundThunks.push({
                    key,
                    date,
                    fn: () => fetchAndSaveTikTok(shopNumber, date)
                });
            } else {
                syncPromises.push(fetchAndSaveTikTok(shopNumber, date));
                loadedFromApiCount++;
            }
        } else if (isRecentPast) {
            if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
                // Queue background revalidation thunk
                backgroundThunks.push({
                    key,
                    date,
                    fn: () => fetchAndSaveTikTok(shopNumber, date)
                });
            } else {
                syncPromises.push(fetchAndSaveTikTok(shopNumber, date));
                loadedFromApiCount++;
            }
        } else {
            // Historical
            if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
            } else {
                syncPromises.push(fetchAndSaveTikTok(shopNumber, date));
                loadedFromApiCount++;
            }
        }
    });

    if (syncPromises.length > 0) {
        const results = await Promise.all(syncPromises);
        results.forEach(r => {
            totalGMV += r.gmv;
            totalSpend += r.spend;
            totalOrders += r.orders;
            if (r.shopName) shopName = r.shopName;
        });
    }

    const sst = totalSpend * 0.08;
    const wht = totalSpend * 0.08;
    const totalCostWithTaxes = totalSpend + sst + wht;
    const roasBeforeTax = totalSpend > 0 ? totalGMV / totalSpend : 0;
    const roasAfterTax = totalCostWithTaxes > 0 ? totalGMV / totalCostWithTaxes : 0;

    let dataSource = 'live_api';
    if (loadedFromDbCount > 0 && loadedFromApiCount > 0) {
        dataSource = 'database+api';
    } else if (loadedFromDbCount > 0) {
        dataSource = 'database';
    }

    return {
        shopNumber,
        shopName,
        gmv: totalGMV,
        orderCount: totalOrders,
        totalAdsSpend: totalSpend,
        totalCostWithTaxes,
        sst,
        wht,
        roasBeforeTax,
        roasAfterTax,
        dataSource,
        dateRange: { start: startDate, end: endDate }
    };
}

async function fetchShopeeShopMetricsSWR(
    shopId: number,
    startDate: string,
    endDate: string,
    today: string,
    backgroundThunks: { key: string; date: string; fn: () => Promise<any> }[]
) {
    const dates = generateDateRange(startDate, endDate);
    
    // Fetch DB rows
    const dbResult = await query(`
        SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, cpas_spend, shopee_cpc_spend, shop_name, updated_at
        FROM credentials.daily_shopee_metrics
        WHERE shop_id = $1 AND date >= $2::date AND date <= $3::date
    `, [shopId, startDate, endDate]);

    const dbMap: Record<string, any> = {};
    dbResult.rows.forEach(row => {
        dbMap[row.date] = {
            gmv: parseFloat(row.gmv),
            spend: parseFloat(row.spend_before_tax),
            orders: parseInt(row.order_count, 10),
            cpasSpend: parseFloat(row.cpas_spend || 0),
            shopeeCpcSpend: parseFloat(row.shopee_cpc_spend || 0),
            shopName: row.shop_name,
            updatedAt: row.updated_at
        };
    });

    let totalGMV = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    let totalCpasSpend = 0;
    let totalShopeeCpcSpend = 0;
    let shopName = `Shopee Shop ${shopId}`;
    let loadedFromDbCount = 0;
    let loadedFromApiCount = 0;

    const syncPromises: Promise<{ gmv: number; spend: number; orders: number; cpasSpend: number; shopeeCpcSpend: number; shopName?: string }>[] = [];

    dates.forEach(date => {
        const isToday = date === today;
        const isRecentPast = !isToday && dateDiffDays(date, today) <= 1; // only yesterday - avoids overwriting historical corrections
        const cached = dbMap[date];
        const key = `shopee_${date}_${shopId}`;

        if (isToday) {
            // Serve cache if fresh (< 5 min), else revalidate in background
            const FIVE_MIN_MS = 5 * 60 * 1000;
            const isCacheFresh = cached?.updatedAt && (Date.now() - new Date(cached.updatedAt).getTime()) < FIVE_MIN_MS;

            if (cached && isCacheFresh) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                totalCpasSpend += cached.cpasSpend;
                totalShopeeCpcSpend += cached.shopeeCpcSpend;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
            } else if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                totalCpasSpend += cached.cpasSpend;
                totalShopeeCpcSpend += cached.shopeeCpcSpend;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
                // Queue background revalidation
                backgroundThunks.push({
                    key,
                    date,
                    fn: () => fetchAndSaveShopee(shopId, date)
                });
            } else {
                syncPromises.push(fetchAndSaveShopee(shopId, date));
                loadedFromApiCount++;
            }
        } else if (isRecentPast) {
            if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                totalCpasSpend += cached.cpasSpend;
                totalShopeeCpcSpend += cached.shopeeCpcSpend;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
                backgroundThunks.push({
                    key,
                    date,
                    fn: () => fetchAndSaveShopee(shopId, date)
                });
            } else {
                syncPromises.push(fetchAndSaveShopee(shopId, date));
                loadedFromApiCount++;
            }
        } else {
            if (cached) {
                totalGMV += cached.gmv;
                totalSpend += cached.spend;
                totalOrders += cached.orders;
                totalCpasSpend += cached.cpasSpend;
                totalShopeeCpcSpend += cached.shopeeCpcSpend;
                if (cached.shopName) shopName = cached.shopName;
                loadedFromDbCount++;
            } else {
                syncPromises.push(fetchAndSaveShopee(shopId, date));
                loadedFromApiCount++;
            }
        }
    });

    if (syncPromises.length > 0) {
        const results = await Promise.all(syncPromises);
        results.forEach(r => {
            totalGMV += r.gmv;
            totalSpend += r.spend;
            totalOrders += r.orders;
            totalCpasSpend += r.cpasSpend || 0;
            totalShopeeCpcSpend += r.shopeeCpcSpend || 0;
            if (r.shopName) shopName = r.shopName;
        });
    }

    const sst = totalSpend * 0.08;
    const wht = totalSpend * 0.08;
    const totalCostWithTaxes = totalSpend + sst + wht;
    const roasBeforeTax = totalSpend > 0 ? totalGMV / totalSpend : 0;
    const roasAfterTax = totalCostWithTaxes > 0 ? totalGMV / totalCostWithTaxes : 0;

    let dataSource = 'live_api';
    if (loadedFromDbCount > 0 && loadedFromApiCount > 0) {
        dataSource = 'database+api';
    } else if (loadedFromDbCount > 0) {
        dataSource = 'database';
    }

    return {
        shopId,
        shopName,
        gmv: totalGMV,
        orderCount: totalOrders,
        totalAdsSpend: totalSpend,
        totalCostWithTaxes,
        cpasSpend: totalCpasSpend,
        shopeeCpcSpend: totalShopeeCpcSpend,
        sst,
        wht,
        roasBeforeTax,
        roasAfterTax,

        dataSource,
        dateRange: { start: startDate, end: endDate }
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const prevStartDate = searchParams.get('prevStartDate');
    const prevEndDate = searchParams.get('prevEndDate');

    if (!startDate || !endDate || !prevStartDate || !prevEndDate) {
        return NextResponse.json({ error: 'Missing parameters: startDate, endDate, prevStartDate, prevEndDate' }, { status: 400 });
    }

    try {
        const today = getKLToday();

        // 1. Fetch connected Shopee shops
        let shopeeShops: any[] = [];
        try {
            shopeeShops = await getConnectedShopeeShops();
        } catch (e) {
            console.error('[summary] Failed to fetch Shopee shops:', e);
        }

        const shopIndices = [1, 2, 3, 4];
        const backgroundRevalidateThunks: { key: string; date: string; fn: () => Promise<any> }[] = [];

        // 2. Fetch all current and previous shop metrics with SWR DB-first caching in parallel
        const [
            curResults,
            prevResults,
            shopeeCurResults,
            shopeePrevResults
        ] = await Promise.all([
            Promise.all(shopIndices.map(num => fetchTikTokShopMetricsSWR(num, startDate, endDate, today, backgroundRevalidateThunks))),
            Promise.all(shopIndices.map(num => fetchTikTokShopMetricsSWR(num, prevStartDate, prevEndDate, today, backgroundRevalidateThunks))),
            Promise.all(shopeeShops.map(shop => fetchShopeeShopMetricsSWR(parseInt(shop.shop_id, 10), startDate, endDate, today, backgroundRevalidateThunks))),
            Promise.all(shopeeShops.map(shop => fetchShopeeShopMetricsSWR(parseInt(shop.shop_id, 10), prevStartDate, prevEndDate, today, backgroundRevalidateThunks)))
        ]);

        // 3. Trigger SWR background revalidations sequentially spaced by 200ms to avoid rate limits
        if (backgroundRevalidateThunks.length > 0) {
            console.log(`[summary-swr] SWR: Triggering ${backgroundRevalidateThunks.length} background revalidations sequentially...`);
            (async () => {
                try {
                    for (let i = 0; i < backgroundRevalidateThunks.length; i++) {
                        const item = backgroundRevalidateThunks[i];
                        console.log(`[summary-swr] SWR: [${i + 1}/${backgroundRevalidateThunks.length}] Revalidating ${item.key} for ${item.date}...`);
                        await item.fn();
                        // Sleep for 200ms between calls
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    console.log(`[summary-swr] SWR: Background revalidation completed successfully for ${backgroundRevalidateThunks.length} items`);
                } catch (e: any) {
                    console.error('[summary-swr] SWR: Background revalidation error:', e.message);
                }
            })();
        }

        return NextResponse.json({
            curResults,
            prevResults,
            shopeeCurResults,
            shopeePrevResults
        });

    } catch (e: any) {
        console.error('[summary] Global API error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
