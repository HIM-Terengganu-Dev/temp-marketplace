import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

async function verify() {
    try {
        const result = await query(`
            SELECT id, shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count
            FROM credentials.daily_shop_metrics
            ORDER BY date DESC, shop_number ASC;
        `);
        console.log('\n--- DATABASE ROWS IN credentials.daily_shop_metrics ---');
        console.table(result.rows);
        process.exit(0);
    } catch (e) {
        console.error('Error selecting:', e);
        process.exit(1);
    }
}

verify();
