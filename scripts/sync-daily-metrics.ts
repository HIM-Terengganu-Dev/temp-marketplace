import dotenv from 'dotenv';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '../src/lib/metrics-fetcher';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Script to sync daily metrics into the database
 * Usage:
 *   npx tsx scripts/sync-daily-metrics.ts [startDate] [endDate]
 * Example:
 *   npx tsx scripts/sync-daily-metrics.ts 2026-05-01 2026-05-05
 */
async function runSync() {
    // Parse CLI arguments
    const args = process.argv.slice(2);
    let startDateStr = args[0];
    let endDateStr = args[1];

    // Default to "today - 13 days" (e.g., on May 14, target is May 1)
    if (!startDateStr || !endDateStr) {
        const now = new Date();
        const klTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        
        const targetDate = new Date(klTime);
        targetDate.setDate(klTime.getDate() - 13);
        const defaultDateStr = targetDate.toISOString().split('T')[0];

        startDateStr = startDateStr || defaultDateStr;
        endDateStr = endDateStr || defaultDateStr;
    }

    console.log(`==================================================`);
    console.log(`🚀 STARTING DAILY METRICS SYNC`);
    console.log(`📅 Target Date Range: ${startDateStr} to ${endDateStr}`);
    console.log(`==================================================`);

    try {
        // Generate list of dates between startDate and endDate
        const dates: string[] = [];
        let curr = new Date(startDateStr);
        const end = new Date(endDateStr);

        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        let successCount = 0;
        let failCount = 0;
        const summaryRows: any[] = [];

        for (const date of dates) {
            console.log(`\n📅 Processing date: ${date}`);
            console.log(`--------------------------------------------------`);

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
                        console.log(`⏭️ Shop ${shopNumber} (${shopConfig.name}) already has data for ${date}. Skipping...`);
                        summaryRows.push({
                            Date: date,
                            Shop: shopConfig.name,
                            GMV: 'SKIPPED (Already exists)',
                            'Spend (Before)': 'SKIPPED',
                            'Spend (After)': 'SKIPPED',
                            'ROAS (Before)': 'SKIPPED',
                            'ROAS (After)': 'SKIPPED',
                            Orders: 'SKIPPED'
                        });
                        successCount++;
                        continue;
                    }

                    process.stdout.write(`⏳ Syncing shop ${shopNumber} (${shopConfig.name})... `);
                    
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

                    console.log(`✅ Success`);
                    summaryRows.push({
                        Date: date,
                        Shop: gmvData.shopName || shopConfig.name,
                        GMV: `RM ${gmv.toFixed(2)}`,
                        'Spend (Before)': `RM ${spendBeforeTax.toFixed(2)}`,
                        'Spend (After)': `RM ${spendAfterTax.toFixed(2)}`,
                        'ROAS (Before)': `${roasBeforeTax.toFixed(2)}x`,
                        'ROAS (After)': `${roasAfterTax.toFixed(2)}x`,
                        Orders: orderCount
                    });
                    successCount++;
                } catch (error: any) {
                    console.log(`❌ Failed: ${error.message}`);
                    summaryRows.push({
                        Date: date,
                        Shop: shopConfig.name,
                        GMV: 'ERROR',
                        'Spend (Before)': 'ERROR',
                        'Spend (After)': 'ERROR',
                        'ROAS (Before)': 'ERROR',
                        'ROAS (After)': 'ERROR',
                        Orders: 'ERROR'
                    });
                    failCount++;
                }
            }
        }

        console.log(`\n==================================================`);
        console.log(`📊 SYNC SUMMARY`);
        console.log(`==================================================`);
        console.table(summaryRows);
        console.log(`\n🎉 Sync Completed!`);
        console.log(`✅ Successful syncs: ${successCount}`);
        console.log(`❌ Failed syncs: ${failCount}`);
        console.log(`==================================================`);

        process.exit(0);

    } catch (err: any) {
        console.error('\n❌ Global Sync Error:', err.message);
        process.exit(1);
    }
}

runSync();
