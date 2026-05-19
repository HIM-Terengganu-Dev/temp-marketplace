import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { query } from '@/lib/db';

/**
 * Smart data endpoint for shop metrics.
 *
 * Strategy:
 *  - If the ENTIRE requested date range is older than 14 days:
 *      → Read from DB. If any dates are missing, fetch from TikTok API, save, then return.
 *  - If ANY part of the date range is within the last 14 days (still-settling):
 *      → Always call TikTok live API directly (data may still change).
 *
 * This prevents wasted API calls for historical queries while keeping live data fresh.
 */

function getKLToday(): string {
    const now = new Date();
    // Get current date in KL timezone (GMT+8) as a YYYY-MM-DD string
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // en-CA gives YYYY-MM-DD format
}

function dateDiffDays(dateStr: string, todayStr: string): number {
    // Parse as UTC midnight to avoid local timezone shifting the day
    const [dy, dm, dd] = dateStr.split('-').map(Number);
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const d1 = Date.UTC(dy, dm - 1, dd);
    const d2 = Date.UTC(ty, tm - 1, td);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    // Use Date.UTC to avoid local-timezone shifting during date iteration
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

type MetricRow = {
    date: string;
    gmv: number;
    spendBeforeTax: number;
    spendAfterTax: number;
    orderCount: number;
    shopName: string;
    source: 'database' | 'api';
};

async function getFromDB(shopNumber: number, startDate: string, endDate: string): Promise<MetricRow[]> {
    const result = await query(`
        SELECT
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            gmv,
            spend_before_tax,
            spend_after_tax,
            order_count,
            shop_name
        FROM credentials.daily_shop_metrics
        WHERE shop_number = $1
          AND date >= $2::date
          AND date <= $3::date
        ORDER BY date ASC
    `, [shopNumber, startDate, endDate]);

    return result.rows.map(row => ({
        date: row.date,   // plain YYYY-MM-DD string from TO_CHAR — no timezone shift
        gmv: parseFloat(row.gmv),
        spendBeforeTax: parseFloat(row.spend_before_tax),
        spendAfterTax: parseFloat(row.spend_after_tax),
        orderCount: parseInt(row.order_count, 10),
        shopName: row.shop_name,
        source: 'database' as const
    }));
}

async function fetchAndSaveDay(shopNumber: number, date: string): Promise<MetricRow> {
    const shopConfig = SHOPS[shopNumber.toString()];

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

    // Save to database for future queries
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

    return {
        date,
        gmv,
        spendBeforeTax,
        spendAfterTax,
        orderCount,
        shopName: gmvData.shopName || shopConfig.name,
        source: 'api' as const
    };
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

    const today = getKLToday();
    const daysOldStart = dateDiffDays(startDate, today);
    const daysOldEnd = dateDiffDays(endDate, today);

    // If BOTH start and end are strictly older than 14 days → use DB-first strategy
    const isHistorical = daysOldStart > 14 && daysOldEnd > 14;

    try {
        let totalGMV = 0;
        let totalSpendBeforeTax = 0;
        let totalSpendAfterTax = 0;
        let totalOrderCount = 0;
        let shopName = SHOPS[shopNumber.toString()]?.name || `Shop ${shopNumber}`;
        let dataSource = 'live_api';

        if (isHistorical) {
            // === DB-FIRST PATH ===
            dataSource = 'database';
            const dates = generateDateRange(startDate, endDate);

            // Load whatever we have in the DB
            const dbRows = await getFromDB(shopNumber, startDate, endDate);
            const dbDateSet = new Set(dbRows.map(r => r.date));

            // Find which dates are missing from DB
            const missingDates = dates.filter(d => !dbDateSet.has(d));

            // Fetch missing dates from TikTok API and save them
            const apiRows: typeof dbRows = [];
            for (const date of missingDates) {
                try {
                    console.log(`[DB-First] Cache miss for shop ${shopNumber} on ${date}. Fetching from API...`);
                    const row = await fetchAndSaveDay(shopNumber, date);
                    apiRows.push(row);
                    dataSource = 'database+api'; // mixed
                } catch (e: any) {
                    console.error(`[DB-First] Failed to fetch shop ${shopNumber} for ${date}:`, e.message);
                }
            }

            // Aggregate all rows (DB + freshly fetched)
            const allRows = [...dbRows, ...apiRows];
            for (const row of allRows) {
                totalGMV += row.gmv;
                totalSpendBeforeTax += row.spendBeforeTax;
                totalSpendAfterTax += row.spendAfterTax;
                totalOrderCount += row.orderCount;
                if (row.shopName) shopName = row.shopName;
            }

        } else {
            // === LIVE API PATH (within 14-day window) ===
            const [gmvData, roasData] = await Promise.all([
                fetchShopGMV(shopNumber, startDate, endDate),
                fetchShopROAS(shopNumber, startDate, endDate)
            ]);

            totalGMV = gmvData.gmv || 0;
            totalSpendBeforeTax = roasData.totalAdsSpend || 0;
            totalSpendAfterTax = roasData.totalCostWithTaxes || 0;
            totalOrderCount = gmvData.orderCount || 0;
            shopName = gmvData.shopName || shopName;
        }

        const roasBeforeTax = totalSpendBeforeTax > 0 ? totalGMV / totalSpendBeforeTax : 0;
        const roasAfterTax = totalSpendAfterTax > 0 ? totalGMV / totalSpendAfterTax : 0;

        return NextResponse.json({
            shopNumber,
            shopName,
            gmv: totalGMV,
            orderCount: totalOrderCount,
            totalAdsSpend: totalSpendBeforeTax,
            totalCostWithTaxes: totalSpendAfterTax,
            sst: totalSpendBeforeTax * 0.08,
            wht: totalSpendBeforeTax * 0.08,
            roasBeforeTax,
            roasAfterTax,
            dataSource,
            dateRange: { start: startDate, end: endDate }
        });

    } catch (error: any) {
        console.error(`[shop-metrics] Error for shop ${shopNumber}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
