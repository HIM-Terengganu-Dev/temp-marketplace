import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops } from '@/lib/shopee-client';
import { query } from '@/lib/db';
import { differenceInDays, parseISO, format } from 'date-fns';

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

        return { gmv, spend: spendBeforeTax, orders: orderCount };
    } catch (e: any) {
        console.error(`[daily-trend] TikTok Shop ${shopNumber} failed for ${date}:`, e.message);
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

        await query(`
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_id, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                updated_at = CURRENT_TIMESTAMP
        `, [shopId, data.shopName, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount]);

        return { gmv, spend: spendBeforeTax, orders: orderCount };
    } catch (e: any) {
        console.error(`[daily-trend] Shopee Shop ${shopId} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, orders: 0 };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const company = searchParams.get('company') || 'ALL';
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    try {
        const today = getKLToday();
        const dates = generateDateRange(startDate, endDate);

        // 1. Fetch connected Shopee shops
        let shopeeShops: any[] = [];
        try {
            shopeeShops = await getConnectedShopeeShops();
        } catch (e) {
            console.error('[daily-trend] Failed to fetch Shopee shops:', e);
        }

        const shopIndices = [1, 2, 3, 4];

        // 2. Fetch all existing rows in bulk from DB for the entire range
        const [tiktokDbResult, shopeeDbResult] = await Promise.all([
            query(`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, shop_number, gmv, spend_before_tax, spend_after_tax, order_count
                FROM credentials.daily_shop_metrics
                WHERE date >= $1::date AND date <= $2::date
            `, [startDate, endDate]),
            query(`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, shop_id, gmv, spend_before_tax, spend_after_tax, order_count
                FROM credentials.daily_shopee_metrics
                WHERE date >= $1::date AND date <= $2::date
            `, [startDate, endDate])
        ]);

        // Map DB rows by date and shop
        const tiktokDbMap: Record<string, Record<number, any>> = {};
        tiktokDbResult.rows.forEach(row => {
            if (!tiktokDbMap[row.date]) tiktokDbMap[row.date] = {};
            tiktokDbMap[row.date][row.shop_number] = {
                gmv: parseFloat(row.gmv),
                spend: parseFloat(row.spend_before_tax),
                orders: parseInt(row.order_count, 10)
            };
        });

        const shopeeDbMap: Record<string, Record<number, any>> = {};
        shopeeDbResult.rows.forEach(row => {
            const shopId = parseInt(row.shop_id, 10);
            if (!shopeeDbMap[row.date]) shopeeDbMap[row.date] = {};
            shopeeDbMap[row.date][shopId] = {
                gmv: parseFloat(row.gmv),
                spend: parseFloat(row.spend_before_tax),
                orders: parseInt(row.order_count, 10)
            };
        });

        // 3. Construct data mappings
        const shopDataMap: Record<string, Record<string, { gmv: number; spend: number; orders: number }>> = {};
        dates.forEach(date => {
            shopDataMap[date] = {};
        });

        const syncFetchPromises: { key: string; date: string; promise: Promise<{ gmv: number; spend: number; orders: number }> }[] = [];
        const backgroundRevalidateThunks: { key: string; date: string; fn: () => Promise<{ gmv: number; spend: number; orders: number }> }[] = [];

        // Distribute dates using Stale-While-Revalidate strategy
        dates.forEach(date => {
            const isToday = date === today;
            const diff = dateDiffDays(date, today);
            const isRecentPast = !isToday && diff <= 1; // only yesterday (excluding today) - avoids overwriting historical corrections

            // TikTok Shops
            shopIndices.forEach(shopNumber => {
                const cached = tiktokDbMap[date]?.[shopNumber];
                const key = `tiktok_${date}_${shopNumber}`;
                
                if (isToday) {
                    // Today is highly volatile - always fetch live synchronously
                    syncFetchPromises.push({ key, date, promise: fetchAndSaveTikTok(shopNumber, date) });
                } else if (isRecentPast) {
                    if (cached) {
                        // Stale-While-Revalidate: Use cached value instantly
                        shopDataMap[date][key] = cached;
                        // Queue silent background sync lazy thunk to revalidate
                        backgroundRevalidateThunks.push({ key, date, fn: () => fetchAndSaveTikTok(shopNumber, date) });
                    } else {
                        // Cache miss: must fetch synchronously
                        syncFetchPromises.push({ key, date, promise: fetchAndSaveTikTok(shopNumber, date) });
                    }
                } else {
                    // Historical settled dates
                    if (cached) {
                        shopDataMap[date][key] = cached;
                        // SELF-HEALING: Queue a silent background sync if 0 gmv and 0 orders
                        if (cached.gmv === 0 && cached.orders === 0) {
                            backgroundRevalidateThunks.push({ key, date, fn: () => fetchAndSaveTikTok(shopNumber, date) });
                        }
                    } else {
                        // Cache miss: fetch and store synchronously
                        syncFetchPromises.push({ key, date, promise: fetchAndSaveTikTok(shopNumber, date) });
                    }
                }
            });

            // Shopee Shops
            shopeeShops.forEach(shop => {
                const shopId = parseInt(shop.shop_id, 10);
                const cached = shopeeDbMap[date]?.[shopId];
                const key = `shopee_${date}_${shopId}`;
                
                if (isToday) {
                    syncFetchPromises.push({ key, date, promise: fetchAndSaveShopee(shopId, date) });
                } else if (isRecentPast) {
                    if (cached) {
                        shopDataMap[date][key] = cached;
                        backgroundRevalidateThunks.push({ key, date, fn: () => fetchAndSaveShopee(shopId, date) });
                    } else {
                        syncFetchPromises.push({ key, date, promise: fetchAndSaveShopee(shopId, date) });
                    }
                } else {
                    if (cached) {
                        shopDataMap[date][key] = cached;
                        // SELF-HEALING: Queue a silent background sync if 0 gmv and 0 orders
                        if (cached.gmv === 0 && cached.orders === 0) {
                            backgroundRevalidateThunks.push({ key, date, fn: () => fetchAndSaveShopee(shopId, date) });
                        }
                    } else {
                        syncFetchPromises.push({ key, date, promise: fetchAndSaveShopee(shopId, date) });
                    }
                }
            });
        });

        // 4. Resolve synchronous fetches in parallel
        if (syncFetchPromises.length > 0) {
            console.log(`[daily-trend] Synchronously fetching ${syncFetchPromises.length} cache misses/live shop metrics...`);
            const syncResults = await Promise.all(syncFetchPromises.map(p => p.promise));
            syncFetchPromises.forEach((item, idx) => {
                shopDataMap[item.date][item.key] = syncResults[idx];
            });
        }

        // 5. Aggregate metrics daily across all shops
        const points = dates.map(date => {
            let dailyGmv = 0;
            let dailySpend = 0;
            let dailyOrders = 0;

            const dayMetrics = shopDataMap[date];
            Object.entries(dayMetrics).forEach(([key, m]) => {
                let shopCompany = 'WEROCA';
                if (key.startsWith('tiktok_')) {
                    const shopNumber = parseInt(key.split('_')[2], 10);
                    if (shopNumber === 1 || shopNumber === 2) {
                        shopCompany = 'HIMWELLNESS';
                    }
                } else if (key.startsWith('shopee_')) {
                    const shopIdStr = key.split('_')[2];
                    const shp = shopeeShops.find((s: any) => s.shop_id === shopIdStr);
                    const name = shp?.shop_name?.toLowerCase() || '';
                    if (name.includes('him.drsamhan') || name.includes('himclinic')) {
                        shopCompany = 'HIMWELLNESS';
                    }
                }

                if (company === 'ALL' || shopCompany === company) {
                    dailyGmv += m.gmv;
                    dailySpend += m.spend;
                    dailyOrders += m.orders;
                }
            });

            const roas = dailySpend > 0 ? dailyGmv / dailySpend : 0;
            const parsedDate = parseISO(date);
            const label = format(parsedDate, 'MMM d');

            return {
                label,
                gmv: parseFloat(dailyGmv.toFixed(2)),
                spend: parseFloat(dailySpend.toFixed(2)),
                roas: parseFloat(roas.toFixed(2)),
                orders: dailyOrders
            };
        });

        // 6. Trigger background revalidations asynchronously (do not await)
        if (backgroundRevalidateThunks.length > 0) {
            console.log(`[daily-trend] SWR: Triggering ${backgroundRevalidateThunks.length} background revalidations sequentially...`);
            (async () => {
                try {
                    for (let i = 0; i < backgroundRevalidateThunks.length; i++) {
                        const item = backgroundRevalidateThunks[i];
                        console.log(`[daily-trend] SWR: [${i + 1}/${backgroundRevalidateThunks.length}] Syncing ${item.key} for ${item.date}...`);
                        await item.fn();
                        // Sleep for 500ms to respect API rate limits and avoid throttling
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    console.log(`[daily-trend] SWR: Background revalidation completed successfully for ${backgroundRevalidateThunks.length} items`);
                } catch (e: any) {
                    console.error('[daily-trend] SWR: Background revalidation error:', e.message);
                }
            })();
        }

        // Return immediate response to the client
        return NextResponse.json(points);

    } catch (error: any) {
        console.error('[daily-trend] Global API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
