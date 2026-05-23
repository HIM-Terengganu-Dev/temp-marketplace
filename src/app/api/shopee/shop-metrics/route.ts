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

type MetricRow = {
    date: string;
    gmv: number;
    spendBeforeTax: number;
    spendAfterTax: number;
    orderCount: number;
    shopName: string;
    source: 'database' | 'api';
};

async function getFromDB(shopId: number, startDate: string, endDate: string): Promise<MetricRow[]> {
    const result = await query(`
        SELECT
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            gmv,
            spend_before_tax,
            spend_after_tax,
            order_count,
            shop_name
        FROM credentials.daily_shopee_metrics
        WHERE shop_id = $1
          AND date >= $2::date
          AND date <= $3::date
        ORDER BY date ASC
    `, [shopId, startDate, endDate]);

    return result.rows.map(row => ({
        date: row.date,
        gmv: parseFloat(row.gmv),
        spendBeforeTax: parseFloat(row.spend_before_tax),
        spendAfterTax: parseFloat(row.spend_after_tax),
        orderCount: parseInt(row.order_count, 10),
        shopName: row.shop_name,
        source: 'database' as const
    }));
}

async function fetchAndSaveDay(shopId: number, date: string): Promise<MetricRow> {
    const data = await fetchShopeeShopPerformance(shopId, date, date);

    const gmv = data.gmv || 0;
    const orderCount = data.orderCount || 0;
    const spendBeforeTax = data.spendBeforeTax || 0;
    const spendAfterTax = data.spendAfterTax || 0;
    const roasBeforeTax = data.roasBeforeTax || 0;
    const roasAfterTax = data.roasAfterTax || 0;

    // Save to database for future queries
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

    return {
        date,
        gmv,
        spendBeforeTax,
        spendAfterTax,
        orderCount,
        shopName: data.shopName,
        source: 'api' as const
    };
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

    const today = getKLToday();
    const daysOldStart = dateDiffDays(startDate, today);
    const daysOldEnd = dateDiffDays(endDate, today);

    // Cache-first for historical days (strictly older than 14 days)
    const isHistorical = daysOldStart > 14 && daysOldEnd > 14;

    try {
        let totalGMV = 0;
        let totalSpendBeforeTax = 0;
        let totalSpendAfterTax = 0;
        let totalOrderCount = 0;
        let shopName = `Shopee Shop ${shopId}`;
        let dataSource = 'live_api';

        if (isHistorical) {
            dataSource = 'database';
            const dates = generateDateRange(startDate, endDate);

            // Load whatever we have in the DB
            const dbRows = await getFromDB(shopId, startDate, endDate);
            const dbDateSet = new Set(dbRows.map(r => r.date));

            // Find missing dates
            const missingDates = dates.filter(d => !dbDateSet.has(d));

            // Fetch missing dates from API and save
            const apiRows: typeof dbRows = [];
            for (const date of missingDates) {
                try {
                    console.log(`[Shopee DB-First] Cache miss for shop ${shopId} on ${date}. Fetching...`);
                    const row = await fetchAndSaveDay(shopId, date);
                    apiRows.push(row);
                    dataSource = 'database+api';
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Unknown error';
                    console.error(`[Shopee DB-First] Failed to fetch shop ${shopId} for ${date}:`, msg);
                }
            }

            const allRows = [...dbRows, ...apiRows];
            for (const row of allRows) {
                totalGMV += row.gmv;
                totalSpendBeforeTax += row.spendBeforeTax;
                totalSpendAfterTax += row.spendAfterTax;
                totalOrderCount += row.orderCount;
                if (row.shopName) shopName = row.shopName;
            }
        } else {
            // Live path for recent dates (within 14 days)
            const data = await fetchShopeeShopPerformance(shopId, startDate, endDate);
            totalGMV = data.gmv || 0;
            totalSpendBeforeTax = data.spendBeforeTax || 0;
            totalSpendAfterTax = data.spendAfterTax || 0;
            totalOrderCount = data.orderCount || 0;
            shopName = data.shopName || shopName;
        }

        const roasBeforeTax = totalSpendBeforeTax > 0 ? totalGMV / totalSpendBeforeTax : 0;
        const roasAfterTax = totalSpendAfterTax > 0 ? totalGMV / totalSpendAfterTax : 0;

        return NextResponse.json({
            shopId,
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

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[shopee-metrics] Error for shop ${shopId}:`, msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
