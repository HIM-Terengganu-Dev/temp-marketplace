import dotenv from 'dotenv';
import { getConnectedShopeeShops } from '../src/lib/shopee-client';
import { query, pool } from '../src/lib/db';

dotenv.config();

function getKLToday(): string {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    while (curr <= end) {
        const y = curr.getUTCFullYear();
        const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const d = String(curr.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
}

async function testFetchSWR(shopId: number, startDate: string, endDate: string) {
    const today = getKLToday();
    console.log(`\n--- Testing fetchShopeeShopMetricsSWR for Shop ID: ${shopId} (${startDate} to ${endDate}) ---`);
    
    try {
        console.log(`Running database query with shop_id as number: ${shopId}...`);
        const dbResult = await query(`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, gmv, spend_before_tax, spend_after_tax, order_count, cpas_spend, shopee_cpc_spend, shop_name
            FROM credentials.daily_shopee_metrics
            WHERE shop_id = $1 AND date >= $2::date AND date <= $3::date
        `, [shopId, startDate, endDate]);

        console.log(`✅ DB query succeeded! Found ${dbResult.rows.length} rows.`);
        console.log(`Rows:`, JSON.stringify(dbResult.rows, null, 2));
    } catch (e: any) {
        console.error(`❌ DB query failed:`, e.message);
        console.error(e.stack);
    }
}

async function run() {
    try {
        console.log('Fetching connected Shopee shops...');
        const shopeeShops = await getConnectedShopeeShops();
        console.log(`Found ${shopeeShops.length} connected Shopee shops.`);

        const today = getKLToday();
        for (const shop of shopeeShops) {
            await testFetchSWR(parseInt(shop.shop_id, 10), today, today);
        }

    } catch (e: any) {
        console.error('Error during test execution:', e);
    } finally {
        await pool.end();
    }
}

run();
