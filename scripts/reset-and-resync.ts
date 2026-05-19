import dotenv from 'dotenv';
import { query } from '../src/lib/db';
import { fetchShopGMV, fetchShopROAS, SHOPS } from '../src/lib/metrics-fetcher';

dotenv.config();

async function resetAndResync() {
    console.log('==================================================');
    console.log('🗑️  CLEARING ALL STALE METRICS FROM DATABASE...');
    console.log('==================================================');

    const countResult = await query('SELECT COUNT(*) as total FROM credentials.daily_shop_metrics');
    const total = parseInt(countResult.rows[0].total, 10);
    console.log(`Found ${total} existing records.`);

    await query('DELETE FROM credentials.daily_shop_metrics');
    console.log(`✅ Deleted all ${total} stale records.`);

    // Determine date range to re-sync:
    // From today - 90 days to today - 14 days
    const now = new Date();
    const klTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));

    const endDate = new Date(klTime);
    endDate.setDate(klTime.getDate() - 14);
    const endDateStr = endDate.toISOString().split('T')[0];

    const startDate = new Date(klTime);
    startDate.setDate(klTime.getDate() - 90);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`\n🚀 RE-SYNCING from ${startDateStr} to ${endDateStr}...`);
    console.log('==================================================');

    const dates: string[] = [];
    let curr = new Date(startDateStr);
    const end = new Date(endDateStr);
    while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    let successCount = 0;
    let failCount = 0;

    for (const date of dates) {
        process.stdout.write(`📅 ${date}: `);
        for (const shopNumStr of ['1', '2', '3', '4']) {
            const shopNumber = parseInt(shopNumStr, 10);
            const shopConfig = SHOPS[shopNumStr];
            try {
                const gmvData = await fetchShopGMV(shopNumber, date, date);
                const roasData = await fetchShopROAS(shopNumber, date, date);

                const gmv = gmvData.gmv || 0;
                const orderCount = gmvData.orderCount || 0;
                const spendBeforeTax = roasData.totalAdsSpend || 0;
                const spendAfterTax = roasData.totalCostWithTaxes || 0;
                const roasBeforeTax = spendBeforeTax > 0 ? (gmv / spendBeforeTax) : 0;
                const roasAfterTax = spendAfterTax > 0 ? (gmv / spendAfterTax) : 0;

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

                process.stdout.write(`Shop${shopNumber}✅ `);
                successCount++;
            } catch (error: any) {
                process.stdout.write(`Shop${shopNumber}❌ `);
                failCount++;
            }
        }
        console.log('');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n==================================================');
    console.log(`✅ Successful syncs: ${successCount}`);
    console.log(`❌ Failed syncs: ${failCount}`);
    console.log('==================================================');
    process.exit(0);
}

resetAndResync().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
