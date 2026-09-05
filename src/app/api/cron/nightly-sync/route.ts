import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops } from '@/lib/shopee-client';
import { query } from '@/lib/db';
import { recordSyncEvent } from '@/lib/sync-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 300s on Vercel Pro (capped safely at 60s on Hobby)

/**
 * Vercel Cron Job — Nightly Metrics Sync
 *
 * Schedule: Every day at 17:00 UTC = 1:00 AM KL (GMT+8)
 * Configured in: vercel.json  →  { "crons": [{ "path": "/api/cron/nightly-sync", "schedule": "0 17 * * *" }] }
 *
 * Security: Vercel automatically sets the Authorization header with CRON_SECRET.
 * Requests without the correct secret are rejected with 401.
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

/** Returns today's date string in KL timezone. */
function getKLToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

/** Returns a date N days before the given YYYY-MM-DD string. */
function subDaysKL(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - n));
    return dt.toISOString().split('T')[0];
}

interface SyncShopResult {
    success: boolean;
    shopName: string;
    gmv?: number;
    orders?: number;
    spend?: number;
    error?: string;
    warning?: string;
}

async function syncTikTokShop(shopNumber: number, date: string, retries = 1): Promise<SyncShopResult> {
    const shopConfig = SHOPS[shopNumber.toString()];
    if (!shopConfig) return { success: false, shopName: `Shop ${shopNumber}`, error: 'Config missing' };

    try {
        // Resilient parallel fetch: decouple GMV and ROAS
        // If ROAS/Ads API fails (token blip or rate limit), GMV & Orders are preserved
        const [gmvSettled, roasSettled] = await Promise.allSettled([
            fetchShopGMV(shopNumber, date, date),
            fetchShopROAS(shopNumber, date, date),
        ]);

        if (gmvSettled.status === 'rejected') {
            if (retries > 0) {
                console.warn(`[cron/nightly-sync] TikTok Shop ${shopNumber} GMV fetch failed (${gmvSettled.reason?.message}). Retrying in 1s...`);
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
            console.warn(`[cron/nightly-sync] TikTok Shop ${shopNumber} Ads ROAS warning: ${roasWarning}`);
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
            shopName: gmvData.shopName || shopConfig.name,
            gmv,
            orders: orderCount,
            spend: spendBeforeTax,
            warning: roasWarning || undefined
        };
    } catch (e: any) {
        console.error(`[cron/nightly-sync] TikTok Shop ${shopNumber} error:`, e.message);
        return { success: false, shopName: shopConfig.name, error: e.message };
    }
}

async function syncShopeeShop(shopId: number, shopName: string, date: string, retries = 1): Promise<SyncShopResult> {
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
                ad_impressions, ad_clicks, ad_orders, ad_sales, cancelled_order_count, cancelled_gmv, updated_at
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

        return { success: true, shopName: data.shopName || shopName, gmv, orders: orderCount, spend: spendBeforeTax };
    } catch (e: any) {
        if (retries > 0) {
            console.warn(`[cron/nightly-sync] Shopee Shop ${shopId} failed (${e.message}). Retrying in 1s...`);
            await sleep(1000);
            return syncShopeeShop(shopId, shopName, date, retries - 1);
        }
        console.error(`[cron/nightly-sync] Shopee Shop ${shopId} error:`, e.message);
        return { success: false, shopName, error: e.message };
    }
}

/**
 * Guard-sync: Checks past 2 days for missing rows across TikTok and Shopee and backfills them.
 * Optimized with batch database queries to avoid serial roundtrips.
 */
async function runGuardSync(todayKL: string, currentSyncDate: string, shopeeShops: { shop_id: string; shop_name: string }[]) {
    const guardDates = [subDaysKL(todayKL, 1), subDaysKL(todayKL, 2)].filter(d => d !== currentSyncDate);
    if (guardDates.length === 0) return;

    try {
        // 1. Batch query existing TikTok entries
        const existingTtRes = await query(
            `SELECT date::text as d, shop_number FROM credentials.daily_shop_metrics WHERE date = ANY($1::date[])`,
            [guardDates]
        );
        const existingTtSet = new Set(existingTtRes.rows.map((r: any) => `${r.d.split('T')[0]}_${r.shop_number}`));

        for (const guardDate of guardDates) {
            for (const shopNum of [1, 2, 3, 4]) {
                const key = `${guardDate}_${shopNum}`;
                if (!existingTtSet.has(key)) {
                    console.log(`[cron/nightly-sync] Guard-healing missing TikTok shop ${shopNum} for ${guardDate}...`);
                    await syncTikTokShop(shopNum, guardDate);
                    await sleep(200);
                }
            }
        }

        // 2. Batch query existing Shopee entries
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
                        console.log(`[cron/nightly-sync] Guard-healing missing Shopee shop ${shop.shop_name} (${shopId}) for ${guardDate}...`);
                        await syncShopeeShop(shopId, shop.shop_name, guardDate);
                        await sleep(200);
                    }
                }
            }
        }
    } catch (guardErr: any) {
        console.warn(`[cron/nightly-sync] Guard-sync warning:`, guardErr.message);
    }
}

export async function GET(request: Request) {
    // ── Security: verify Vercel cron secret ──────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[cron/nightly-sync] CRON_SECRET env var is not set!');
        return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET missing' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/nightly-sync] Unauthorized request rejected');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Determine date to sync ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getKLYesterday();

    const startedAt = new Date().toISOString();
    console.log(`[cron/nightly-sync] Starting optimized sync for date: ${date}`);

    // Pre-fetch Shopee shop list once
    let shopeeShops: { shop_id: string; shop_name: string }[] = [];
    try {
        shopeeShops = await getConnectedShopeeShops();
    } catch (e: any) {
        console.warn('[cron/nightly-sync] Could not fetch Shopee shops:', e.message);
    }

    // ── Guard-sync past 2 days in background or before main sync ─────────────
    const todayKL = getKLToday();
    await runGuardSync(todayKL, date, shopeeShops);

    // ── Run TikTok & Shopee sync pipelines CONCURRENTLY ──────────────────────
    // Running in parallel cuts total execution time down by ~50%
    const [tiktokResults, shopeeResults] = await Promise.all([
        (async () => {
            const list: { shopNumber: number; shopName: string; success: boolean; gmv?: number; orders?: number; spend?: number; error?: string; warning?: string }[] = [];
            for (const shopNumber of [1, 2, 3, 4]) {
                const r = await syncTikTokShop(shopNumber, date);
                list.push({ shopNumber, ...r });
                await sleep(200); // polite rate-limit buffer
            }
            return list;
        })(),
        (async () => {
            const list: { shopId: number; shopName: string; success: boolean; gmv?: number; orders?: number; spend?: number; error?: string }[] = [];
            for (const shop of shopeeShops) {
                const shopId = parseInt(shop.shop_id, 10);
                const r = await syncShopeeShop(shopId, shop.shop_name, date);
                list.push({ shopId, ...r });
                await sleep(200);
            }
            return list;
        })()
    ]);

    const results = {
        tiktok: tiktokResults,
        shopee: shopeeResults
    };

    // ── Summary & Accurate Status Recording ──────────────────────────────────
    const ttsOk   = results.tiktok.filter(r => r.success).length;
    const ttsFail = results.tiktok.filter(r => !r.success).length;
    const shpOk   = results.shopee.filter(r => r.success).length;
    const shpFail = results.shopee.filter(r => !r.success).length;

    const summary = {
        date,
        startedAt,
        finishedAt: new Date().toISOString(),
        tiktok: { success: ttsOk, failed: ttsFail },
        shopee: { success: shpOk, failed: shpFail },
        results,
    };

    // AWAIT sync tracking to prevent serverless freeze from dropping updates
    const syncStatusPromises: Promise<any>[] = [];

    const ttStatus = ttsOk > 0 ? (ttsFail > 0 ? 'success' : 'success') : 'error';
    syncStatusPromises.push(
        recordSyncEvent('tiktok_api', ttStatus, { count: ttsOk, failed: ttsFail, date }),
        recordSyncEvent('tiktok_db', ttStatus, { count: ttsOk, failed: ttsFail, date })
    );

    if (shopeeShops.length > 0) {
        const shpStatus = shpOk > 0 ? (shpFail > 0 ? 'success' : 'success') : 'error';
        syncStatusPromises.push(
            recordSyncEvent('shopee_api', shpStatus, { count: shpOk, failed: shpFail, date }),
            recordSyncEvent('shopee_db', shpStatus, { count: shpOk, failed: shpFail, date })
        );
    }

    await Promise.allSettled(syncStatusPromises);

    console.log(`[cron/nightly-sync] Done — TikTok: ${ttsOk}✅ ${ttsFail}❌  Shopee: ${shpOk}✅ ${shpFail}❌`);

    const hasFailures = ttsFail > 0 || shpFail > 0;
    return NextResponse.json(summary, { status: hasFailures ? 207 : 200 });
}
