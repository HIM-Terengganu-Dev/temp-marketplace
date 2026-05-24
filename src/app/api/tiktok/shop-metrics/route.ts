import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
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

        await query(`
            INSERT INTO credentials.daily_shop_metrics (
                shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_number, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                updated_at = CURRENT_TIMESTAMP
        `, [shopNumber, gmvData.shopName || shopConfig.name, date, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount]);

        return { gmv, spend: spendBeforeTax, orders: orderCount };
    } catch (e: any) {
        console.error(`[shop-metrics-swr] TikTok Shop ${shopNumber} failed for ${date}:`, e.message);
        return { gmv: 0, spend: 0, orders: 0 };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}` }, { status: 400 });
    }

    try {
        const today = getKLToday();
        const dates = generateDateRange(startDate, endDate);

        // 1. Fetch bulk rows from DB for this shop and range
        const dbResult = await query(`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, shop_name
            FROM credentials.daily_shop_metrics
            WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
        `, [shopNumber, startDate, endDate]);

        const dbMap: Record<string, any> = {};
        dbResult.rows.forEach(row => {
            dbMap[row.date] = {
                gmv: parseFloat(row.gmv),
                spend: parseFloat(row.spend_before_tax),
                spendAfterTax: parseFloat(row.spend_after_tax),
                orders: parseInt(row.order_count, 10),
                shopName: row.shop_name
            };
        });

        let totalGMV = 0;
        let totalSpend = 0;
        let totalSpendAfterTax = 0;
        let totalOrders = 0;
        const shopConfig = SHOPS[shopNumber.toString()];
        let shopName = shopConfig?.name || `Shop ${shopNumber}`;
        let loadedFromDbCount = 0;
        let loadedFromApiCount = 0;

        const syncFetchPromises: { date: string; promise: Promise<{ gmv: number; spend: number; orders: number }> }[] = [];
        const backgroundRevalidateThunks: { key: string; date: string; fn: () => Promise<any> }[] = [];

        dates.forEach(date => {
            const isToday = date === today;
            const isRecentPast = !isToday && dateDiffDays(date, today) <= 1; // only yesterday - avoids overwriting historical corrections
            const cached = dbMap[date];
            const key = `tiktok_${date}_${shopNumber}`;

            if (isToday) {
                // Today is live - fetch synchronously
                syncFetchPromises.push({ date, promise: fetchAndSaveTikTok(shopNumber, date) });
                loadedFromApiCount++;
            } else if (isRecentPast) {
                if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                    // Queue background revalidation thunk
                    backgroundRevalidateThunks.push({
                        key,
                        date,
                        fn: () => fetchAndSaveTikTok(shopNumber, date)
                    });
                } else {
                    syncFetchPromises.push({ date, promise: fetchAndSaveTikTok(shopNumber, date) });
                    loadedFromApiCount++;
                }
            } else {
                // Historical
                if (cached) {
                    totalGMV += cached.gmv;
                    totalSpend += cached.spend;
                    totalSpendAfterTax += cached.spendAfterTax;
                    totalOrders += cached.orders;
                    if (cached.shopName) shopName = cached.shopName;
                    loadedFromDbCount++;
                } else {
                    syncFetchPromises.push({ date, promise: fetchAndSaveTikTok(shopNumber, date) });
                    loadedFromApiCount++;
                }
            }
        });

        // Resolve synchronous fetches in parallel
        if (syncFetchPromises.length > 0) {
            console.log(`[tiktok-shop-metrics-swr] Synchronously fetching ${syncFetchPromises.length} cache misses/live shop metrics...`);
            const syncResults = await Promise.all(syncFetchPromises.map(p => p.promise));
            syncFetchPromises.forEach((item, idx) => {
                const r = syncResults[idx];
                totalGMV += r.gmv;
                totalSpend += r.spend;
                // Since spendAfterTax is not returned directly, approximate or look up after tax
                totalSpendAfterTax += r.spend * 1.16; // 8% SST + 8% WHT
                totalOrders += r.orders;
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
            console.log(`[tiktok-shop-metrics-swr] SWR: Triggering ${backgroundRevalidateThunks.length} background revalidations sequentially...`);
            (async () => {
                try {
                    for (let i = 0; i < backgroundRevalidateThunks.length; i++) {
                        const item = backgroundRevalidateThunks[i];
                        console.log(`[tiktok-shop-metrics-swr] SWR: [${i + 1}/${backgroundRevalidateThunks.length}] Revalidating ${item.key} for ${item.date}...`);
                        await item.fn();
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    console.log(`[tiktok-shop-metrics-swr] SWR: Background revalidation completed successfully`);
                } catch (e: any) {
                    console.error('[tiktok-shop-metrics-swr] SWR: Background revalidation error:', e.message);
                }
            })();
        }

        return NextResponse.json({
            shopNumber,
            shopName,
            gmv: totalGMV,
            orderCount: totalOrders,
            totalAdsSpend: totalSpend,
            totalCostWithTaxes: totalSpendAfterTax,
            sst: totalSpend * 0.08,
            wht: totalSpend * 0.08,
            roasBeforeTax,
            roasAfterTax,
            dataSource,
            dateRange: { start: startDate, end: endDate }
        });

    } catch (error: any) {
        console.error(`[tiktok-shop-metrics-swr] Error:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
