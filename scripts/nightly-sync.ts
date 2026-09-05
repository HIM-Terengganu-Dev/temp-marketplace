import * as dotenv from 'dotenv';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '../src/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops } from '../src/lib/shopee-client';
import { query, pool } from '../src/lib/db';
import { recordSyncEvent } from '../src/lib/sync-tracker';

dotenv.config();

/**
 * Nightly sync script — force-refreshes TikTok + Shopee metrics for past days.
 * Designed to run as a cron job at 1:00 AM KL (17:00 UTC) every night or via CLI.
 *
 * Usage:
 *   npx tsx scripts/nightly-sync.ts                  → syncs yesterday only (with guard-sync)
 *   npx tsx scripts/nightly-sync.ts 2026-06-04        → syncs a specific date
 *   npx tsx scripts/nightly-sync.ts 2026-06-01 2026-06-05  → syncs a date range
 *
 * npm script:
 *   npm run db:nightly-sync
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Returns yesterday's date string in KL timezone (Asia/Kuala_Lumpur).
 * Uses a timezone-safe approach: first get today's KL date string,
 * parse it as UTC midnight, then subtract 1 day — avoids any UTC/KL
 * boundary drift that can occur with raw millisecond subtraction.
 */
function getKLYesterday(): string {
    const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const [y, m, d] = todayKL.split('-').map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1));
    return yesterday.toISOString().split('T')[0];
}

function getKLToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function subDaysKL(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - n));
    return dt.toISOString().split('T')[0];
}

function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
}

async function syncTikTokShop(shopNumber: number, date: string, retries = 1): Promise<{ success: boolean; gmv?: number; orders?: number; spend?: number; shopName?: string; warning?: string }> {
    const shopConfig = SHOPS[shopNumber.toString()];
    if (!shopConfig) return { success: false };

    try {
        const [gmvSettled, roasSettled] = await Promise.allSettled([
            fetchShopGMV(shopNumber, date, date),
            fetchShopROAS(shopNumber, date, date),
        ]);

        if (gmvSettled.status === 'rejected') {
            if (retries > 0) {
                console.warn(`    ⚠️  TikTok Shop ${shopNumber} GMV fetch failed (${gmvSettled.reason?.message}). Retrying in 1s...`);
                await sleep(1000);
                return syncTikTokShop(shopNumber, date, retries - 1);
            }
            throw new Error(`GMV fetch failed: ${gmvSettled.reason?.message || 'Unknown error'}`);
        }

        const gmvData = gmvSettled.value;
        let roasData: any = {};
        let roasWarning = '';

        if (roasSettled.status === 'fulfilled') {
            roasData = roasSettled.value;
        } else {
            roasWarning = `Ads ROAS fetch failed (${roasSettled.reason?.message}); saved with 0 ads spend`;
        }

        const gmv                 = gmvData.gmv || 0;
        const orderCount          = gmvData.orderCount || 0;
        const spendBeforeTax      = roasData.totalAdsSpend || 0;
        const spendAfterTax       = roasData.totalCostWithTaxes || 0;
        const liveGMVMaxCost      = roasData.liveGMVMaxCost || 0;
        const productGMVMaxCost   = roasData.productGMVMaxCost || 0;
        const manualCampaignSpend = roasData.manualCampaignSpend || 0;
        const roasBeforeTax       = spendBeforeTax > 0 ? gmv / spendBeforeTax : 0;
        const roasAfterTax        = spendAfterTax  > 0 ? gmv / spendAfterTax  : 0;

        const cancelledOrders     = (gmvData.orders || []).filter((o: any) => o.status === 'CANCELLED');
        const cancelledOrderCount = cancelledOrders.length;
        const cancelledGMV        = cancelledOrders.reduce((sum: number, o: any) => sum + (o.gmv || 0), 0);

        const impressions         = roasData.impressions || 0;
        const thruplay            = roasData.thruplay || 0;
        const visitors            = roasData.clicks || 0;

        await query(`
            INSERT INTO credentials.daily_shop_metrics (
                shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax,
                roas_before_tax, roas_after_tax, order_count,
                live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend,
                cancelled_order_count, cancelled_gmv,
                impressions, thruplay, visitors, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_number, date) DO UPDATE SET
                shop_name             = EXCLUDED.shop_name,
                gmv                   = EXCLUDED.gmv,
                spend_before_tax      = EXCLUDED.spend_before_tax,
                spend_after_tax       = EXCLUDED.spend_after_tax,
                roas_before_tax       = EXCLUDED.roas_before_tax,
                roas_after_tax        = EXCLUDED.roas_after_tax,
                order_count           = EXCLUDED.order_count,
                live_gmv_max_cost     = EXCLUDED.live_gmv_max_cost,
                product_gmv_max_cost  = EXCLUDED.product_gmv_max_cost,
                manual_campaign_spend = EXCLUDED.manual_campaign_spend,
                cancelled_order_count = EXCLUDED.cancelled_order_count,
                cancelled_gmv         = EXCLUDED.cancelled_gmv,
                impressions           = EXCLUDED.impressions,
                thruplay              = EXCLUDED.thruplay,
                visitors              = EXCLUDED.visitors,
                updated_at            = CURRENT_TIMESTAMP
        `, [shopNumber, gmvData.shopName || shopConfig.name, date,
            gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax,
            orderCount, liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend,
            cancelledOrderCount, cancelledGMV,
            impressions, thruplay, visitors]);

        return {
            success: true,
            gmv,
            orders: orderCount,
            spend: spendBeforeTax,
            shopName: gmvData.shopName || shopConfig.name,
            warning: roasWarning || undefined
        };
    } catch (e: any) {
        console.error(`    ❌ TikTok Shop ${shopNumber} failed: ${e.message}`);
        return { success: false };
    }
}

async function syncShopeeShop(shopId: number, shopName: string, date: string, retries = 1): Promise<{ success: boolean; gmv?: number; orders?: number; spend?: number }> {
    try {
        const data = await fetchShopeeShopPerformance(shopId, date, date);
        const gmv             = data.gmv || 0;
        const orderCount      = data.orderCount || 0;
        const spendBeforeTax  = data.spendBeforeTax || 0;
        const spendAfterTax   = data.spendAfterTax || 0;
        const roasBeforeTax   = data.roasBeforeTax || 0;
        const roasAfterTax    = data.roasAfterTax || 0;
        const cpasSpend       = data.cpasSpend || 0;
        const shopeeCpcSpend  = data.shopeeCpcSpend || 0;
        
        const adImpressions   = data.adImpressions || 0;
        const adClicks        = data.adClicks || 0;
        const adOrders        = data.adOrders || 0;
        const adSales         = data.adSales || 0;

        const cancelledOrders     = (data.orders || []).filter((o: any) => o.status === 'CANCELLED');
        const cancelledOrderCount = cancelledOrders.length;
        const cancelledGMV        = cancelledOrders.reduce((sum: number, o: any) => sum + (o.gmv || 0), 0);

        await query(`
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax,
                roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend,
                ad_impressions, ad_clicks, ad_orders, ad_sales,
                cancelled_order_count, cancelled_gmv, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_id, date) DO UPDATE SET
                shop_name        = EXCLUDED.shop_name,
                gmv              = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax  = EXCLUDED.spend_after_tax,
                roas_before_tax  = EXCLUDED.roas_before_tax,
                roas_after_tax   = EXCLUDED.roas_after_tax,
                order_count      = EXCLUDED.order_count,
                cpas_spend       = EXCLUDED.cpas_spend,
                shopee_cpc_spend = EXCLUDED.shopee_cpc_spend,
                ad_impressions   = EXCLUDED.ad_impressions,
                ad_clicks        = EXCLUDED.ad_clicks,
                ad_orders        = EXCLUDED.ad_orders,
                ad_sales         = EXCLUDED.ad_sales,
                cancelled_order_count = EXCLUDED.cancelled_order_count,
                cancelled_gmv         = EXCLUDED.cancelled_gmv,
                updated_at       = CURRENT_TIMESTAMP
        `, [shopId, data.shopName || shopName, date,
            gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax,
            orderCount, cpasSpend, shopeeCpcSpend, adImpressions, adClicks, adOrders, adSales,
            cancelledOrderCount, cancelledGMV]);

        return { success: true, gmv, orders: orderCount, spend: spendBeforeTax };
    } catch (e: any) {
        if (retries > 0) {
            console.warn(`    ⚠️  Shopee Shop ${shopId} failed (${e.message}). Retrying in 1s...`);
            await sleep(1000);
            return syncShopeeShop(shopId, shopName, date, retries - 1);
        }
        console.error(`    ❌ Shopee Shop ${shopId} failed: ${e.message}`);
        return { success: false };
    }
}

async function runGuardHealing(shopeeShops: { shop_id: string; shop_name: string }[]) {
    const todayKL = getKLToday();
    const guardDates = [subDaysKL(todayKL, 1), subDaysKL(todayKL, 2)];
    console.log(`🛡️  Running guard check for past days: ${guardDates.join(', ')}`);

    try {
        const existingTtRes = await query(
            `SELECT date::text as d, shop_number FROM credentials.daily_shop_metrics WHERE date = ANY($1::date[])`,
            [guardDates]
        );
        const existingTtSet = new Set(existingTtRes.rows.map((r: any) => `${r.d.split('T')[0]}_${r.shop_number}`));

        for (const guardDate of guardDates) {
            for (const shopNum of [1, 2, 3, 4]) {
                const key = `${guardDate}_${shopNum}`;
                if (!existingTtSet.has(key)) {
                    console.log(`   [Guard] Healing missing TikTok shop ${shopNum} for ${guardDate}...`);
                    await syncTikTokShop(shopNum, guardDate);
                    await sleep(200);
                }
            }
        }

        if (shopeeShops.length > 0) {
            const existingShpRes = await query(
                `SELECT date::text as d, shop_id FROM credentials.daily_shopee_metrics WHERE date = ANY($1::date[])`,
                [guardDates]
            );
            const existingShpSet = new Set(existingShpRes.rows.map((r: any) => `${r.d.split('T')[0]}_${r.shop_id}`));

            for (const guardDate of guardDates) {
                for (const shop of shopeeShops) {
                    const shopId = parseInt(shop.shop_id, 10);
                    const key = `${guardDate}_${shopId}`;
                    if (!existingShpSet.has(key)) {
                        console.log(`   [Guard] Healing missing Shopee shop ${shop.shop_name} for ${guardDate}...`);
                        await syncShopeeShop(shopId, shop.shop_name, guardDate);
                        await sleep(200);
                    }
                }
            }
        }
    } catch (err: any) {
        console.warn(`   ⚠️ Guard healing error:`, err.message);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const isDefaultRun = args.length === 0;
    const startDate = args[0] || getKLYesterday();
    const endDate   = args[1] || startDate;
    const dates     = generateDateRange(startDate, endDate);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌙 NIGHTLY SYNC — HIM Marketplace Metrics`);
    console.log(`📅 Date range: ${startDate} → ${endDate}  (${dates.length} day${dates.length > 1 ? 's' : ''})`);
    console.log(`⏰ Started:    ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} KL`);
    console.log(`${'='.repeat(60)}\n`);

    let ttsSuccess = 0, ttsFail = 0;
    let shpSuccess = 0, shpFail = 0;

    let shopeeShops: { shop_id: string; shop_name: string }[] = [];
    try {
        shopeeShops = await getConnectedShopeeShops();
        console.log(`🛒 Found ${shopeeShops.length} connected Shopee shop(s)\n`);
    } catch (e: any) {
        console.warn(`⚠️  Could not fetch Shopee shops: ${e.message}`);
    }

    if (isDefaultRun) {
        await runGuardHealing(shopeeShops);
    }

    for (const date of dates) {
        console.log(`\n📅 ${date}`);
        console.log(`${'─'.repeat(50)}`);

        // Run TikTok and Shopee in parallel
        const [ttResults, shpResults] = await Promise.all([
            (async () => {
                const list = [];
                for (const shopNumStr of ['1', '2', '3', '4']) {
                    const shopNumber = parseInt(shopNumStr, 10);
                    const shopConfig = SHOPS[shopNumStr];
                    process.stdout.write(`  🎵 TikTok Shop ${shopNumber} (${shopConfig.name})... `);

                    const result = await syncTikTokShop(shopNumber, date);
                    if (result.success) {
                        console.log(`✅ GMV: RM ${(result.gmv || 0).toFixed(2)} · Orders: ${result.orders} · Spend: RM ${(result.spend || 0).toFixed(2)}${result.warning ? ` (${result.warning})` : ''}`);
                    }
                    list.push(result);
                    await sleep(200);
                }
                return list;
            })(),
            (async () => {
                const list = [];
                if (shopeeShops.length > 0) {
                    for (const shop of shopeeShops) {
                        const shopId = parseInt(shop.shop_id, 10);
                        process.stdout.write(`  🟠 Shopee Shop ${shopId} (${shop.shop_name})... `);

                        const result = await syncShopeeShop(shopId, shop.shop_name, date);
                        if (result.success) {
                            console.log(`✅ GMV: RM ${(result.gmv || 0).toFixed(2)} · Orders: ${result.orders} · Spend: RM ${(result.spend || 0).toFixed(2)}`);
                        }
                        list.push(result);
                        await sleep(200);
                    }
                }
                return list;
            })()
        ]);

        const ttOk = ttResults.filter(r => r.success).length;
        const ttFl = ttResults.filter(r => !r.success).length;
        const shOk = shpResults.filter(r => r.success).length;
        const shFl = shpResults.filter(r => !r.success).length;

        ttsSuccess += ttOk;
        ttsFail    += ttFl;
        shpSuccess += shOk;
        shpFail    += shFl;

        // Record sync event for this date
        await Promise.allSettled([
            recordSyncEvent('tiktok_api', ttOk > 0 ? 'success' : 'error', { count: ttOk, failed: ttFl, date }),
            recordSyncEvent('tiktok_db', ttOk > 0 ? 'success' : 'error', { count: ttOk, failed: ttFl, date }),
            recordSyncEvent('shopee_api', shOk > 0 ? 'success' : 'error', { count: shOk, failed: shFl, date }),
            recordSyncEvent('shopee_db', shOk > 0 ? 'success' : 'error', { count: shOk, failed: shFl, date }),
        ]);
    }

    const totalSuccess = ttsSuccess + shpSuccess;
    const totalFail    = ttsFail + shpFail;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SYNC COMPLETE`);
    console.log(`   TikTok  →  ✅ ${ttsSuccess}  ❌ ${ttsFail}`);
    if (shopeeShops.length > 0) {
        console.log(`   Shopee  →  ✅ ${shpSuccess}  ❌ ${shpFail}`);
    }
    console.log(`   Total   →  ✅ ${totalSuccess}  ❌ ${totalFail}`);
    console.log(`⏰ Finished: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} KL`);
    console.log(`${'='.repeat(60)}\n`);

    await pool.end();
    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(async (e) => {
    console.error('\n❌ Fatal error:', e.message);
    await pool.end();
    process.exit(1);
});
