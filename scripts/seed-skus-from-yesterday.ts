import { fetchShopGMV } from '../src/lib/metrics-fetcher';
import { query, pool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        const dateStr = '2026-05-25';
        console.log(`Triggering fetchShopGMV for Shop 1 on ${dateStr} to seed auto-discovered SKUs...`);
        
        const result = await fetchShopGMV(1, dateStr, dateStr);
        console.log(`Shop 1 GMV result:`, JSON.stringify({
            shopName: result.shopName,
            gmv: result.gmv,
            cogs: result.cogs,
            orderCount: result.orderCount,
            totalOrderCount: result.totalOrderCount
        }, null, 2));

        console.log('\nChecking credentials.sku_cogs database records...');
        const dbRes = await query('SELECT * FROM credentials.sku_cogs', []);
        console.log(`Found ${dbRes.rows.length} total SKUs registered in local database:`);
        dbRes.rows.forEach((row: any, idx: number) => {
            console.log(`  [SKU ${idx + 1}] ID: ${row.sku_id}, Name: "${row.product_name}", Price: RM ${row.price}, Cost: RM ${row.cogs_cost}, Mapped: ${row.is_mapped}`);
        });

    } catch (e: any) {
        console.error('Test failed:', e);
    } finally {
        await pool.end();
    }
}

run();
