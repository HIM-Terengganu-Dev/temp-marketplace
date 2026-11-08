
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { query } from '../src/lib/db';
import { fetchShopeeAdsTotalBalance } from '../src/lib/shopee-client';

async function testAll() {
    try {
        const res = await query('SELECT shop_id, shop_name FROM credentials.refresh_shopeeshops_token ORDER BY shop_id ASC');
        console.log(`Found ${res.rows.length} Shopee shops in database.\n`);

        for (const shop of res.rows) {
            const shopId = Number(shop.shop_id);
            try {
                const result = await fetchShopeeAdsTotalBalance(shopId);
                console.log(`✅ [${shop.shop_name}] (ID: ${shopId}) -> RM ${result.total_balance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            } catch (err: any) {
                console.error(`❌ [${shop.shop_name}] (ID: ${shopId}) -> Error: ${err.message}`);
            }
        }
    } catch (err: any) {
        console.error('Database connection error:', err.message);
    }
}

testAll().then(() => process.exit(0)).catch(() => process.exit(1));
