import { query, pool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        const date = '2026-05-25';
        console.log(`Querying all shop metrics from DB for ${date}...`);

        console.log('\n--- Shopee Shops Daily Metrics ---');
        const shopeeRes = await query(`
            SELECT shop_id, shop_name, gmv, spend_before_tax, order_count
            FROM credentials.daily_shopee_metrics
            WHERE date = $1::date
        `, [date]);
        
        let shopeeGmvSum = 0;
        shopeeRes.rows.forEach(r => {
            console.log(`  Shop: ${r.shop_name} (${r.shop_id}), GMV: RM ${r.gmv}, Spend: RM ${r.spend_before_tax}, Orders: ${r.order_count}`);
            shopeeGmvSum += parseFloat(r.gmv || '0');
        });
        console.log(`  Total Shopee GMV: RM ${shopeeGmvSum.toFixed(2)}`);

        console.log('\n--- TikTok Shops Daily Metrics from db (if any syncs exist) ---');
        const tiktokRes = await query(`
            SELECT *
            FROM credentials.daily_shop_metrics
            WHERE date = $1::date
        `, [date]);
        
        console.log(JSON.stringify(tiktokRes.rows, null, 2));
        let tiktokDbGmvSum = 0;
        tiktokRes.rows.forEach(r => {
            tiktokDbGmvSum += parseFloat(r.gmv || '0');
        });
        console.log(`  Total TikTok DB GMV: RM ${tiktokDbGmvSum.toFixed(2)}`);

        const grandTotal = shopeeGmvSum + tiktokDbGmvSum;
        console.log(`\nCombined Shopee + TikTok DB GMV: RM ${grandTotal.toFixed(2)}`);

    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
