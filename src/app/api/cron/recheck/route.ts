import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { query } from '@/lib/db';

/**
 * Manual Data Recheck & Backfill Endpoint
 *
 * GET /api/cron/recheck?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Scans the database for TikTok shops with missing or zero-data rows
 * in the specified date range (defaults: last 3 days including today).
 * Syncs any missing dates/shops and returns a detailed log.
 *
 * Security: Requires Authorization: Bearer <CRON_SECRET> — same as
 * the nightly-sync cron, so the same dashboard call pattern works.
 */

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

interface ShopRecheckResult {
    shopNumber: number;
    shopName: string;
    date: string;
    status: 'skipped' | 'synced' | 'failed';
    wasPresent: boolean;
    gmv?: number;
    orders?: number;
    spend?: number;
    error?: string;
}

async function recheckAndSyncShop(
    shopNumber: number,
    date: string,
    forceResync: boolean
): Promise<ShopRecheckResult> {
    const shopConfig = SHOPS[shopNumber.toString()];
    const shopName = shopConfig?.name || `Shop ${shopNumber}`;

    try {
        // Check if data already exists for this shop+date
        const existing = await query(
            `SELECT gmv, order_count, spend_before_tax, updated_at
             FROM credentials.daily_shop_metrics
             WHERE shop_number = $1 AND date = $2::date`,
            [shopNumber, date]
        );

        const row = existing.rows[0];
        const wasPresent = !!row;
        const hasNonZeroData = row && (parseFloat(row.gmv) > 0 || parseInt(row.order_count, 10) > 0);

        // Skip only if data exists, is non-zero, and forceResync is false
        if (wasPresent && hasNonZeroData && !forceResync) {
            return {
                shopNumber,
                shopName,
                date,
                status: 'skipped',
                wasPresent: true,
                gmv: parseFloat(row.gmv),
                orders: parseInt(row.order_count, 10),
                spend: parseFloat(row.spend_before_tax),
            };
        }

        // Sync this shop for this date
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
        `, [shopNumber, gmvData.shopName || shopName, date,
            gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax,
            orderCount, liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend]);

        return {
            shopNumber,
            shopName: gmvData.shopName || shopName,
            date,
            status: 'synced',
            wasPresent,
            gmv,
            orders: orderCount,
            spend: spendBeforeTax,
        };
    } catch (e: any) {
        console.error(`[cron/recheck] Shop ${shopNumber} on ${date} failed:`, e.message);
        return {
            shopNumber,
            shopName,
            date,
            status: 'failed',
            wasPresent: false,
            error: e.message,
        };
    }
}

export async function GET(request: Request) {
    // ── Security ──────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parameters ───────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const today = getKLToday();
    const startDate = searchParams.get('startDate') || subDaysKL(today, 2);
    const endDate   = searchParams.get('endDate')   || today;
    const forceResync = searchParams.get('force') === 'true';

    const dates = generateDateRange(startDate, endDate);
    const shopNumbers = [1, 2, 3, 4];

    const startedAt = new Date().toISOString();
    console.log(`[cron/recheck] Starting recheck for ${startDate} → ${endDate} (${dates.length} days, force=${forceResync})`);

    const results: ShopRecheckResult[] = [];
    let synced = 0, skipped = 0, failed = 0;

    // Process dates oldest-first; serialize within each date to avoid API hammering
    for (const date of dates) {
        console.log(`[cron/recheck] Checking date: ${date}`);
        for (const shopNumber of shopNumbers) {
            const r = await recheckAndSyncShop(shopNumber, date, forceResync);
            results.push(r);
            if (r.status === 'synced')  synced++;
            if (r.status === 'skipped') skipped++;
            if (r.status === 'failed')  failed++;
            // Rate-limit buffer between API calls
            if (r.status === 'synced' || r.status === 'failed') {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }

    const finishedAt = new Date().toISOString();
    const hasFailures = failed > 0;

    const summary = {
        startDate,
        endDate,
        daysChecked: dates.length,
        shopsPerDay: shopNumbers.length,
        totalChecked: dates.length * shopNumbers.length,
        synced,
        skipped,
        failed,
        forceResync,
        startedAt,
        finishedAt,
        results,
    };

    console.log(`[cron/recheck] Done — synced: ${synced}  skipped: ${skipped}  failed: ${failed}`);
    return NextResponse.json(summary, { status: hasFailures ? 207 : 200 });
}
