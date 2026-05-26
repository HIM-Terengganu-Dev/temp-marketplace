import dotenv from 'dotenv';
import { getConnectedShopeeShops } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';

dotenv.config();

function getKLToday(): string {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

async function run() {
    try {
        console.log('Fetching connected Shopee shops...');
        const shopeeShops = await getConnectedShopeeShops();
        console.log(`Found ${shopeeShops.length} connected Shopee shops:`);
        console.log(JSON.stringify(shopeeShops, null, 2));

        const today = getKLToday();
        console.log(`\nToday (KL): ${today}`);

        console.log('\nQuerying credentials.daily_shopee_metrics directly for today...');
        const dbResult = await query(`
            SELECT shop_id, shop_name, date, gmv, spend_before_tax, order_count 
            FROM credentials.daily_shopee_metrics
            WHERE date = $1::date
        `, [today]);
        console.log(`Found ${dbResult.rows.length} rows for today in DB:`);
        console.log(JSON.stringify(dbResult.rows, null, 2));

        process.exit(0);
    } catch (e: any) {
        console.error('Error during test:', e);
        process.exit(1);
    }
}

run();
