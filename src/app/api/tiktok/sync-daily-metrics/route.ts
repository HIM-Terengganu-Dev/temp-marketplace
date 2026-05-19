import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '@/lib/metrics-fetcher';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDateStr = startDateParam;
    let endDateStr = endDateParam;

    // Default to "today - 13 days" (which translates to: on May 14, save May 1)
    if (!startDateStr || !endDateStr) {
        const now = new Date();
        const klTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        
        const targetDate = new Date(klTime);
        targetDate.setDate(klTime.getDate() - 13);
        const defaultDateStr = targetDate.toISOString().split('T')[0];

        startDateStr = startDateStr || defaultDateStr;
        endDateStr = endDateStr || defaultDateStr;
    }

    try {
        // Generate list of dates between startDate and endDate
        const dates: string[] = [];
        let curr = new Date(startDateStr);
        const end = new Date(endDateStr);

        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        const results: any[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const date of dates) {
            for (const shopNumStr of ['1', '2', '3', '4']) {
                const shopNumber = parseInt(shopNumStr, 10);
                const shopConfig = SHOPS[shopNumStr];

                try {
                    // Check if this specific shop already has data for this date
                    const existingRow = await query(`
                        SELECT 1 FROM credentials.daily_shop_metrics
                        WHERE date = $1 AND shop_number = $2
                    `, [date, shopNumber]);

                    if (existingRow.rows.length > 0) {
                        console.log(`[Sync] Shop ${shopNumber} (${shopConfig.name}) already has data for ${date}. Skipping...`);
                        results.push({
                            shopNumber,
                            shopName: shopConfig.name,
                            date,
                            status: 'skipped',
                            message: 'Already exists in database'
                        });
                        successCount++;
                        continue;
                    }

                    console.log(`[Sync] Syncing shop ${shopNumber} (${shopConfig.name}) for date ${date}...`);
                    
                    // Fetch GMV and ROAS for that single day
                    const gmvData = await fetchShopGMV(shopNumber, date, date);
                    const roasData = await fetchShopROAS(shopNumber, date, date);

                    const gmv = gmvData.gmv || 0;
                    const orderCount = gmvData.orderCount || 0;
                    const spendBeforeTax = roasData.totalAdsSpend || 0;
                    const spendAfterTax = roasData.totalCostWithTaxes || 0;

                    const roasBeforeTax = spendBeforeTax > 0 ? (gmv / spendBeforeTax) : 0;
                    const roasAfterTax = spendAfterTax > 0 ? (gmv / spendAfterTax) : 0;

                    // Upsert into database
                    await query(`
                        INSERT INTO credentials.daily_shop_metrics (
                            shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                        ON CONFLICT (shop_number, date) DO UPDATE SET
                            shop_name = EXCLUDED.shop_name,
                            gmv = EXCLUDED.gmv,
                            spend_before_tax = EXCLUDED.spend_before_tax,
                            spend_after_tax = EXCLUDED.spend_after_tax,
                            roas_before_tax = EXCLUDED.roas_before_tax,
                            roas_after_tax = EXCLUDED.roas_after_tax,
                            order_count = EXCLUDED.order_count,
                            updated_at = CURRENT_TIMESTAMP
                    `, [
                        shopNumber,
                        gmvData.shopName || shopConfig.name,
                        date,
                        gmv,
                        spendBeforeTax,
                        spendAfterTax,
                        roasBeforeTax,
                        roasAfterTax,
                        orderCount
                    ]);

                    results.push({
                        shopNumber,
                        shopName: gmvData.shopName || shopConfig.name,
                        date,
                        status: 'success',
                        metrics: { gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount }
                    });
                    successCount++;
                } catch (error: any) {
                    console.error(`[Sync] Failed syncing shop ${shopNumber} for date ${date}:`, error.message);
                    results.push({
                        shopNumber,
                        shopName: shopConfig.name,
                        date,
                        status: 'failed',
                        error: error.message
                    });
                    failCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            dateRange: { start: startDateStr, end: endDateStr },
            summary: {
                total: successCount + failCount,
                successful: successCount,
                failed: failCount
            },
            results
        });

    } catch (err: any) {
        console.error('[Sync API] Global error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
