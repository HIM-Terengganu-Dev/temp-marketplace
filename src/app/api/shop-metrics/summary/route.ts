import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops, getValidShopeeToken, fetchShopeeGMVAndOrders } from '@/lib/shopee-client';
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

/**
 * Returns true if the DB row for `date` was written AFTER that day fully
 * closed in KL time (i.e. after midnight KL = 16:00 UTC of that day).
 * A row synced before midnight is considered "mid-day stale" and must be
 * re-fetched live to guarantee correct totals.
 */
function isDayClosed(dateStr: string, updatedAt: Date | string | undefined): boolean {
    if (!updatedAt) return false;
    const syncedAt = new Date(updatedAt);
    // Midnight KL (GMT+8) of the NEXT day = 16:00 UTC of `dateStr`
    const [y, m, d] = dateStr.split('-').map(Number);
    const midnightKL = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)); // 16:00 UTC = 00:00 KL next day
    return syncedAt >= midnightKL;
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

        const isToday = date === getKLToday();
        let spendBeforeTax = 0;
        let spendAfterTax = 0;
        let liveGMVMaxCost = 0;
        let productGMVMaxCost = 0;
        let manualCampaignSpend = 0;
        let hasCachedSpend = false;

        // Optimize: Reuse cached daily spend for past days to avoid hitting TikTok Ads API rate limits
        if (!isToday) {
            const cachedRow = await query(`
                SELECT spend_before_tax, spend_after_tax, live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend
                FROM credentials.daily_shop_metrics
                WHERE shop_number = $1 AND date = $2::date
            `, [shopNumber, date]);

            if (cachedRow.rows[0]) {
                const r = cachedRow.rows[0];
                spendBeforeTax = parseFloat(r.spend_before_tax || '0');
                spendAfterTax = parseFloat(r.spend_after_tax || '0');
                liveGMVMaxCost = parseFloat(r.live_gmv_max_cost || '0');
                productGMVMaxCost = parseFloat(r.product_gmv_max_cost || '0');
                manualCampaignSpend = parseFloat(r.manual_campaign_spend || '0');
                hasCachedSpend = true;
            }
        }

        // Fetch spend dynamically if not cached in DB or if it's today's date
        if (!hasCachedSpend) {
            const roasData = await fetchShopROAS(shopNumber, date, date);
            spendBeforeTax = roasData.totalAdsSpend || 0;
            spendAfterTax = roasData.totalCostWithTaxes || 0;
            liveGMVMaxCost = roasData.liveGMVMaxCost || 0;
            productGMVMaxCost = roasData.productGMVMaxCost || 0;
            manualCampaignSpend = roasData.manualCampaignSpend || 0;
        }

        // Always query Shop API for GMV & orders to reflect refunds/cancellations dynamically
        const gmvData = await fetchShopGMV(shopNumber, date, date);
        const gmv = gmvData.gmv || 0;
        const orderCount = gmvData.orderCount || 0;
        const roasBeforeTax = spendBeforeTax > 0 ? gmv / spendBeforeTax : 0;
        const roasAfterTax = spendAfterTax > 0 ? gmv / spendAfterTax : 0;

        if (hasCachedSpend) {
            // For past dates with cached spend: ONLY update GMV, shop_name, orders, and ROAS.
            // Never overwrite spend columns — they are authoritative values written by the nightly sync.
            // Overwriting them here (with stale cached values) creates a self-reinforcing bad-data loop
            // that prevents nightly sync corrections from ever sticking.
            await query(`
                INSERT INTO credentials.daily_shop_metrics (
                    shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                ON CONFLICT (shop_number, date) DO UPDATE SET
                    shop_name = EXCLUDED.shop_name,
                    gmv = EXCLUDED.gmv,
                    roas_before_tax = EXCLUDED.roas_before_tax,
                    roas_after_tax = EXCLUDED.roas_after_tax,
                    order_count = EXCLUDED.order_count,
                    updated_at = CURRENT_TIMESTAMP
            `, [shopNumber, gmvData.shopName || shopConfig.name, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend]);
        } else {
            // For today or first-time sync (no cached spend): write all columns including spend
            await query(`
                INSERT INTO credentials.daily_shop_metrics (
                    shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                ON CONFLICT (shop_number, date) DO UPDATE SET
                    shop_name = EXCLUDED.shop_name,
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
        }

        return { gmv, spend: spendBeforeTax, orders: orderCount, shopName: gmvData.shopName || shopConfig.name };
    } catch (e: any) {
        console.error(`[summary] TikTok Shop ${shopNumber} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, orders: 0 };
    }
}

async function fetchAndSaveShopee(shopId: number, date: string) {
    try {
        const isToday = date === getKLToday();
        let spendBeforeTax = 0;
        let spendAfterTax = 0;
        let cpasSpend = 0;
        let shopeeCpcSpend = 0;
        let hasCachedSpend = false;

        // Optimize: Reuse cached daily spend for past days to avoid hitting Shopee Ads API rate limits
        if (!isToday) {
            const cachedRow = await query(`
                SELECT spend_before_tax, spend_after_tax, cpas_spend, shopee_cpc_spend
                FROM credentials.daily_shopee_metrics
                WHERE shop_id = $1 AND date = $2::date
            `, [shopId, date]);

            if (cachedRow.rows[0]) {
                const r = cachedRow.rows[0];
                const sBefore = parseFloat(r.spend_before_tax || '0');
                const sCpc = parseFloat(r.shopee_cpc_spend || '0');
                const sCpas = parseFloat(r.cpas_spend || '0');
                
                // Only use cached spend if it is non-zero, or if it is older than 3 days
                // (to prevent endlessly re-fetching zero-spend days from the deep past).
                const isRecent = dateDiffDays(date, getKLToday()) <= 3;
                if (sBefore > 0 || !isRecent) {
                    spendBeforeTax = sBefore;
                    spendAfterTax = parseFloat(r.spend_after_tax || '0');
                    cpasSpend = sCpas;
                    shopeeCpcSpend = sCpc;
                    hasCachedSpend = true;
                }
            }
        }

        let gmv = 0;
        let orderCount = 0;
        let shopName = `Shopee Shop ${shopId}`;

        if (hasCachedSpend) {
            // Spend is cached; only query Shopee Order API to get latest GMV / cancellations
            const accessToken = await getValidShopeeToken(shopId);
            const orderData = await fetchShopeeGMVAndOrders(shopId, accessToken, date, date);
            gmv = orderData.gmv || 0;
            orderCount = orderData.orderCount || 0;
            shopName = orderData.shopName;
        } else {
            // Fetch everything dynamically
            const data = await fetchShopeeShopPerformance(shopId, date, date);
            gmv = data.gmv || 0;
            orderCount = data.orderCount || 0;
            spendBeforeTax = data.spendBeforeTax || 0;
            spendAfterTax = data.spendAfterTax || 0;
            cpasSpend = data.cpasSpend || 0;
            shopeeCpcSpend = data.shopeeCpcSpend || 0;
            shopName = data.shopName;
        }

        const roasBeforeTax = spendBeforeTax > 0 ? gmv / spendBeforeTax : 0;
        const roasAfterTax = spendAfterTax > 0 ? gmv / spendAfterTax : 0;

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
        `, [shopId, shopName, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, cpasSpend, shopeeCpcSpend]);

        return { gmv, spend: spendBeforeTax, orders: orderCount, cpasSpend, shopeeCpcSpend, shopName };
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
    let loadedStaleCount = 0; // rows served from DB but written before day closed

    const syncPromises: Promise<{ gmv: number; spend: number; orders: number; shopName?: string }>[] = [];

    dates.forEach(date => {
        const isToday = date === today;
        const isRecentPast = !isToday && dateDiffDays(date, today) <= 7; // past 7 days to dynamically catch order refunds/cancellations
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
                const dayClosed = isDayClosed(date, cached.updatedAt);
                if (dayClosed) {
                    // Day has fully closed and DB was synced after midnight — data is final, trust it
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalOrders += cached.orders;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    // Still queue a light background refresh for refund/cancellation adjustments
                    backgroundThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveTikTok(shopNumber, date)
                    });
                } else {
                    // DB row was written mid-day (before midnight KL) — data is incomplete.
                    // Re-fetch live synchronously so first load shows correct totals.
                    console.log(`[summary-swr] TikTok Shop ${shopNumber} date ${date}: DB cached mid-day (before close), re-fetching live...`);
                    syncPromises.push(fetchAndSaveTikTok(shopNumber, date));
                    loadedStaleCount++;
                    loadedFromApiCount++;
                }
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
                // SELF-HEALING: If historical cached data has exactly 0 gmv and 0 orders, it might be an incomplete transient cache.
                // Queue a background revalidation to heal it.
                if (cached.gmv === 0 && cached.orders === 0) {
                    backgroundThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveTikTok(shopNumber, date)
                    });
                }
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
    // Override with stale marker if any row was served from an incomplete mid-day snapshot
    if (loadedStaleCount > 0 && loadedFromApiCount === loadedStaleCount) {
        // All data came from live re-fetch of stale rows — mark as fresh
        dataSource = 'live_api';
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
    let loadedStaleCount = 0; // rows served from DB but written before day closed

    const syncPromises: Promise<{ gmv: number; spend: number; orders: number; cpasSpend: number; shopeeCpcSpend: number; shopName?: string }>[] = [];

    dates.forEach(date => {
        const isToday = date === today;
        const isRecentPast = !isToday && dateDiffDays(date, today) <= 7; // past 7 days to dynamically catch order refunds/cancellations
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
                const dayClosed = isDayClosed(date, cached.updatedAt);
                if (dayClosed) {
                    // Day has fully closed and DB was synced after midnight — data is final, trust it
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    // Still queue a light background refresh for refund/cancellation adjustments
                    backgroundThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveShopee(shopId, date)
                    });
                } else {
                    // DB row was written mid-day (before midnight KL) — data may be incomplete.
                    // SAFE: Serve the stale cached value immediately so the UI always shows data.
                    // Queue a background revalidation to refresh without risking API failures zeroing the data.
                    console.log(`[summary-swr] Shopee Shop ${shopId} date ${date}: DB cached mid-day (before close), serving stale cache + scheduling background refresh...`);
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalOrders += cached.orders;
                    totalCpasSpend += cached.cpasSpend;
                    totalShopeeCpcSpend += cached.shopeeCpcSpend;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    loadedStaleCount++;
                    // Schedule background refresh to update the DB with final values
                    backgroundThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveShopee(shopId, date)
                    });
                }
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
                // SELF-HEALING: If historical cached data has exactly 0 gmv and 0 orders, it might be an incomplete transient cache.
                // Queue a background revalidation to heal it.
                if (cached.gmv === 0 && cached.orders === 0) {
                    backgroundThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveShopee(shopId, date)
                    });
                }
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
    // If all api loads were re-fetches of stale rows, data is now fresh
    if (loadedStaleCount > 0 && loadedFromApiCount === loadedStaleCount) {
        dataSource = 'live_api';
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
