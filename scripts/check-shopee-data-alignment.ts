import dotenv from 'dotenv';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function run() {
    try {
        console.log('Fetching Shopee metrics data summary from DB...');
        const res = await query(`
            SELECT date::text, shop_name, gmv, order_count, spend_before_tax, updated_at
            FROM credentials.daily_shopee_metrics
            ORDER BY date DESC, shop_name LIMIT 20
        `);

        console.log(`Found ${res.rows.length} recent records:`);
        console.table(res.rows);

    } catch (e: any) {
        console.error('Error querying Shopee metrics:', e);
    } finally {
        await pool.end();
    }
}

run();
