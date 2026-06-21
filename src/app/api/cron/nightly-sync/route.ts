import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { fetchShopeeShopPerformance, getConnectedShopeeShops } from '@/lib/shopee-client';
import { query, pool } from '@/lib/db';

/**
 * Vercel Cron Job — Nightly Metrics Sync
 *
 * Schedule: Every day at 17:00 UTC = 1:00 AM KL (GMT+8)
 * Configured in: vercel.json  →  { "crons": [{ "path": "/api/cron/nightly-sync", "schedule": "0 17 * * *" }] }
 *
 * Security: Vercel automatically sets the Authorization header with CRON_SECRET.
 * Requests without the correct secret are rejected with 401.
 */

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

async function syncTikTokShop(shopNumber: number, date: string) {
    const shopConfig = SHOPS[shopNumber.toString()];
    if (!shopConfig) return { success: false, shopName: `Shop ${shopNumber}` };

    try {
        const [gmvData, roasData] = await Promise.all([
            fetchShopGMV(shopNumber, date, date),
            fetchShopROAS(shopNumber, date, date),
        ]);

        const gmv               = gmvData.gmv || 0;
        const orderCount        = gmvData.orderCount || 0;
        const spendBeforeTax    = roasData.totalAdsSpend || 0;
        const spendAfterTax     = roasData.totalCostWithTaxes || 0;
        const liveGMVMaxCost    = roasData.liveGMVMaxCost || 0;
        const productGMVMaxCost = roasData.productGMVMaxCost || 0;
        const manualCampaignSpend = roasData.manualCampaignSpend || 0;
        const roasBeforeTax     = spendBeforeTax > 0 ? gmv / spendBeforeTax : 0;
        const roasAfterTax      = spendAfterTax  > 0 ? gmv / spendAfterTax  : 0;

        await query(`
            INSERT INTO credentials.daily_shop_metrics (
                shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax,
                roas_before_tax, roas_after_tax, order_count,
                live_gmv_max_cost, product_gmv_max_cost, manual_campaign_spend, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CURRENT_TIMESTAMP)
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
                updated_at            = CURRENT_TIMESTAMP
        `, [shopNumber, gmvData.shopName || shopConfig.name, date,
            gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax,
            orderCount, liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend]);

        return { success: true, shopName: gmvData.shopName || shopConfig.name, gmv, orders: orderCount, spend: spendBeforeTax };
    } catch (e: any) {
        console.error(`[cron/nightly-sync] TikTok Shop ${shopNumber} error:`, e.message);
        return { success: false, shopName: shopConfig.name, error: e.message };
    }
}

async function syncShopeeShop(shopId: number, shopName: string, date: string) {
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
        
        const adImpressions = data.adImpressions || 0;
        const adClicks = data.adClicks || 0;
        const adOrders = data.adOrders || 0;
        const adSales = data.adSales || 0;

        await query(`
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax,
                roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend,
                ad_impressions, ad_clicks, ad_orders, ad_sales, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CURRENT_TIMESTAMP)
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
                updated_at       = CURRENT_TIMESTAMP
        `, [shopId, data.shopName || shopName, date,
            gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax,
            orderCount, cpasSpend, shopeeCpcSpend, adImpressions, adClicks, adOrders, adSales]);

        return { success: true, shopName: data.shopName || shopName, gmv, orders: orderCount, spend: spendBeforeTax };
    } catch (e: any) {
        console.error(`[cron/nightly-sync] Shopee Shop ${shopId} error:`, e.message);
        return { success: false, shopName, error: e.message };
    }
}

export async function GET(request: Request) {
    // ── Security: verify Vercel cron secret ──────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[cron/nightly-sync] CRON_SECRET env var is not set!');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/nightly-sync] Unauthorized request rejected');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Determine date to sync ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getKLYesterday();

    const startedAt = new Date().toISOString();
    console.log(`[cron/nightly-sync] Starting sync for date: ${date}`);

    // ── Guard-sync: heal any missing TikTok data from the past 2 days ────────
    // If the cron failed silently on a recent night, this ensures data is
    // backfilled before we proceed with tonight's sync.
    const today = getKLToday();
    const guardDates = [subDaysKL(today, 1), subDaysKL(today, 2)].filter(d => d !== date);
    for (const guardDate of guardDates) {
        try {
            const existing = await query(
                `SELECT COUNT(*) AS cnt FROM credentials.daily_shop_metrics WHERE date = $1::date`,
                [guardDate]
            );
            const cnt = parseInt(existing.rows[0]?.cnt || '0', 10);
            if (cnt < 4) {
                console.log(`[cron/nightly-sync] Guard-sync: ${guardDate} has only ${cnt}/4 TikTok shop rows — backfilling...`);
                for (const shopNumber of [1, 2, 3, 4]) {
                    const existingShop = await query(
                        `SELECT 1 FROM credentials.daily_shop_metrics WHERE date = $1::date AND shop_number = $2`,
                        [guardDate, shopNumber]
                    );
                    if (existingShop.rows.length === 0) {
                        await syncTikTokShop(shopNumber, guardDate);
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
            }
        } catch (guardErr: any) {
            console.warn(`[cron/nightly-sync] Guard-sync check for ${guardDate} failed:`, guardErr.message);
        }
    }

    const results: {
        tiktok: { shopNumber: number; shopName: string; success: boolean; gmv?: number; orders?: number; spend?: number; error?: string }[];
        shopee: { shopId: number; shopName: string; success: boolean; gmv?: number; orders?: number; spend?: number; error?: string }[];
    } = { tiktok: [], shopee: [] };

    // ── TikTok Shops (1–4) ───────────────────────────────────────────────────
    for (const shopNumber of [1, 2, 3, 4]) {
        const r = await syncTikTokShop(shopNumber, date);
        results.tiktok.push({ shopNumber, ...r });
        // 300ms rate-limit buffer between shops
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // ── Shopee Shops (dynamic from DB) ──────────────────────────────────────
    let shopeeShops: { shop_id: string; shop_name: string }[] = [];
    try {
        shopeeShops = await getConnectedShopeeShops();
    } catch (e: any) {
        console.warn('[cron/nightly-sync] Could not fetch Shopee shops:', e.message);
    }

    for (const shop of shopeeShops) {
        const shopId = parseInt(shop.shop_id, 10);
        const r = await syncShopeeShop(shopId, shop.shop_name, date);
        results.shopee.push({ shopId, ...r });
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const ttsOk  = results.tiktok.filter(r => r.success).length;
    const ttsFail = results.tiktok.filter(r => !r.success).length;
    const shpOk  = results.shopee.filter(r => r.success).length;
    const shpFail = results.shopee.filter(r => !r.success).length;

    const summary = {
        date,
        startedAt,
        finishedAt: new Date().toISOString(),
        tiktok: { success: ttsOk, failed: ttsFail },
        shopee: { success: shpOk, failed: shpFail },
        results,
    };

    console.log(`[cron/nightly-sync] Done — TikTok: ${ttsOk}✅ ${ttsFail}❌  Shopee: ${shpOk}✅ ${shpFail}❌`);

    // Vercel expects the function to complete within 300s (Pro) or 60s (Hobby)
    // Our sync typically finishes in ~40s so we're safe
    const hasFailures = ttsFail > 0 || shpFail > 0;
    return NextResponse.json(summary, { status: hasFailures ? 207 : 200 });
}
