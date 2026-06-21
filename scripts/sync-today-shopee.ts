import * as dotenv from 'dotenv';
import { getConnectedShopeeShops, fetchShopeeShopPerformance } from '../src/lib/shopee-client';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function main() {
    // Get today's date in KL timezone (GMT+8)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    console.log(`\n=============================================================`);
    console.log(`🚀 SYNCING TODAY'S SHOPEE METRICS`);
    console.log(`📅 Target Date: ${today}`);
    console.log(`=============================================================\n`);

    try {
        const shops = await getConnectedShopeeShops();
        console.log(`Found ${shops.length} connected Shopee shops in database.\n`);

        for (const shop of shops) {
            const shopId = shop.shop_id;
            console.log(`-------------------------------------------------------------`);
            console.log(`Shop: ${shop.shop_name} (ID: ${shopId})`);
            console.log(`-------------------------------------------------------------`);
            
            try {
                const data = await fetchShopeeShopPerformance(shopId, today, today);
                
                const gmv = data.gmv || 0;
                const orderCount = data.orderCount || 0;
                const spendBeforeTax = data.spendBeforeTax || 0;
                const spendAfterTax = data.spendAfterTax || 0;
                const roasBeforeTax = data.roasBeforeTax || 0;
                const roasAfterTax = data.roasAfterTax || 0;
                const cpasSpend = data.cpasSpend || 0;
                const shopeeCpcSpend = data.shopeeCpcSpend || 0;

                const adImpressions = data.adImpressions || 0;
                const adClicks = data.adClicks || 0;
                const adOrders = data.adOrders || 0;
                const adSales = data.adSales || 0;

                console.log(`  ✓ GMV:             RM ${gmv.toFixed(2)}`);
                console.log(`  ✓ Order Count:     ${orderCount}`);
                console.log(`  ✓ CPC Spend:       RM ${shopeeCpcSpend.toFixed(2)}`);
                console.log(`  ✓ CPAS Spend:      RM ${cpasSpend.toFixed(2)}`);
                console.log(`  ✓ Total Spend:     RM ${spendBeforeTax.toFixed(2)}`);
                console.log(`  ✓ ROAS Before Tax: ${roasBeforeTax.toFixed(2)}x`);

                // Upsert to DB
                await query(`
                    INSERT INTO credentials.daily_shopee_metrics (
                        shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend,
                        ad_impressions, ad_clicks, ad_orders, ad_sales, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
                    ON CONFLICT (shop_id, date) DO UPDATE SET
                        gmv = EXCLUDED.gmv,
                        spend_before_tax = EXCLUDED.spend_before_tax,
                        spend_after_tax = EXCLUDED.spend_after_tax,
                        roas_before_tax = EXCLUDED.roas_before_tax,
                        roas_after_tax = EXCLUDED.roas_after_tax,
                        order_count = EXCLUDED.order_count,
                        cpas_spend = EXCLUDED.cpas_spend,
                        shopee_cpc_spend = EXCLUDED.shopee_cpc_spend,
                        ad_impressions = EXCLUDED.ad_impressions,
                        ad_clicks = EXCLUDED.ad_clicks,
                        ad_orders = EXCLUDED.ad_orders,
                        ad_sales = EXCLUDED.ad_sales,
                        updated_at = CURRENT_TIMESTAMP
                `, [shopId, data.shopName, today, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount, cpasSpend, shopeeCpcSpend, adImpressions, adClicks, adOrders, adSales]);

                console.log(`  ✅ Successfully saved/updated in database.`);
            } catch (err: any) {
                console.error(`  ❌ Failed to sync performance: ${err.message}`);
            }
        }
        
        console.log(`\n=============================================================`);
        console.log(`🎉 Sync Completed successfully!`);
        console.log(`=============================================================\n`);
    } catch (e: any) {
        console.error(`Global sync error:`, e.message);
    } finally {
        await pool.end();
    }
    process.exit(0);
}

main();
