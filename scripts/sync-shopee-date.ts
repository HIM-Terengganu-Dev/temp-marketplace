import { fetchShopeeShopPerformance } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const shopId = 1298030530; // HIM by Dr Samhan
    const date = '2026-05-23';
    console.log(`Triggering Shopee daily metrics sync for shop ${shopId} on date ${date}...`);

    try {
        const data = await fetchShopeeShopPerformance(shopId, date, date);

        const gmv = data.gmv || 0;
        const orderCount = data.orderCount || 0;
        const spendBeforeTax = data.spendBeforeTax || 0;
        const spendAfterTax = data.spendAfterTax || 0;
        const roasBeforeTax = data.roasBeforeTax || 0;
        const roasAfterTax = data.roasAfterTax || 0;
        const cpasSpend = data.cpasSpend || 0;
        const shopeeCpcSpend = data.shopeeCpcSpend || 0;

        console.log(`\nNew Calculated Metrics for ${data.shopName}:`);
        console.log(`- GMV:             RM ${gmv.toFixed(2)}`);
        console.log(`- Order Count:     ${orderCount}`);
        console.log(`- Ad Spend:        RM ${spendBeforeTax.toFixed(2)}`);
        console.log(`- CPAS Spend:      RM ${cpasSpend.toFixed(2)}`);
        console.log(`- Shopee CPC:      RM ${shopeeCpcSpend.toFixed(2)}`);

        // Upsert into credentials.daily_shopee_metrics
        const sql = `
            INSERT INTO credentials.daily_shopee_metrics (
                shop_id, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, cpas_spend, shopee_cpc_spend, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
            ON CONFLICT (shop_id, date) DO UPDATE SET
                gmv = EXCLUDED.gmv,
                spend_before_tax = EXCLUDED.spend_before_tax,
                spend_after_tax = EXCLUDED.spend_after_tax,
                roas_before_tax = EXCLUDED.roas_before_tax,
                roas_after_tax = EXCLUDED.roas_after_tax,
                order_count = EXCLUDED.order_count,
                cpas_spend = EXCLUDED.cpas_spend,
                shopee_cpc_spend = EXCLUDED.shopee_cpc_spend,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;

        const res = await query(sql, [
            shopId,
            data.shopName,
            date,
            gmv,
            spendBeforeTax,
            spendAfterTax,
            roasBeforeTax,
            roasAfterTax,
            orderCount,
            cpasSpend,
            shopeeCpcSpend
        ]);

        console.log(`\n✓ Cache table successfully updated in database:`);
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (e: any) {
        console.error(`❌ Sync failed:`, e.message || e);
    }
    process.exit(0);
}

main();
