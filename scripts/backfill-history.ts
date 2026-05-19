import dotenv from 'dotenv';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '../src/lib/metrics-fetcher';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Script to backfill the entire last 3 months (90 days) of daily metrics
 * Usage:
 *   npm run db:backfill-history
 */
async function runBackfill() {
    const now = new Date();
    const klTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));

    // Set end date as 14 days ago (to ensure data is settled)
    const endDate = new Date(klTime);
    endDate.setDate(klTime.getDate() - 14);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Set start date as 90 days ago (max historical retention on TikTok APIs)
    const startDate = new Date(klTime);
    startDate.setDate(klTime.getDate() - 90);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`==================================================`);
    console.log(`🚀 STARTING HISTORICAL BACKFILL (90 DAYS WINDOW)`);
    console.log(`📅 Date Range: ${startDateStr} to ${endDateStr}`);
    console.log(`==================================================`);

    try {
        // Generate list of dates
        const dates: string[] = [];
        let curr = new Date(startDateStr);
        const end = new Date(endDateStr);

        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        console.log(`📝 Total days to backfill: ${dates.length}`);
        
        let successCount = 0;
        let failCount = 0;

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
                        successCount++;
                        continue;
                    }

                    process.stdout.write(`⏳ Syncing shop ${shopNumber} (${shopConfig.name})... `);
                    
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
                    successCount++;
                } catch (error: any) {
                    console.log(`❌ Failed: ${error.message}`);
                    failCount++;
                }
            }
            // Add a small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n==================================================`);
        console.log(`🎉 Historical Backfill Completed!`);
        console.log(`✅ Successful syncs: ${successCount}`);
        console.log(`❌ Failed syncs: ${failCount}`);
        console.log(`==================================================`);

        process.exit(0);
    } catch (err: any) {
        console.error('\n❌ Global Backfill Error:', err.message);
        process.exit(1);
    }
}

runBackfill();
