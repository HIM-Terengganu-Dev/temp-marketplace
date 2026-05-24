import * as dotenv from 'dotenv';
import { fetchShopeeShopPerformance } from '../src/lib/shopee-client';
import { pool } from '../src/lib/db';

dotenv.config();

// Get today's date in KL timezone
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

// Test with the main shop
const SHOP_ID = 1298030530;

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing today's data fetch: ${today}`);
    console.log(`Shop ID: ${SHOP_ID}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        const data = await fetchShopeeShopPerformance(SHOP_ID, today, today);
        console.log(`\n✅ Result:`);
        console.log(`  Shop Name:   ${data.shopName}`);
        console.log(`  GMV:         RM ${data.gmv.toFixed(2)}`);
        console.log(`  Orders:      ${data.orderCount} (total fetched: ${data.totalOrderCount})`);
        console.log(`  CPC Spend:   RM ${data.shopeeCpcSpend.toFixed(2)}`);
        console.log(`  CPAS Spend:  RM ${data.cpasSpend.toFixed(2)}`);
        console.log(`  Total Spend: RM ${data.spendBeforeTax.toFixed(2)}`);
        console.log(`  ROAS:        ${data.roasBeforeTax.toFixed(2)}x`);

        if (data.orders.length > 0) {
            console.log(`\n  Order statuses today:`);
            const statusCounts: Record<string, number> = {};
            data.orders.forEach(o => {
                statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
            });
            Object.entries(statusCounts).forEach(([s, c]) => console.log(`    ${s}: ${c}`));
        } else {
            console.log(`\n  ⚠️  No orders found for today (${today})`);
        }
    } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
        console.error(err.stack);
    }

    await pool.end();
    process.exit(0);
}

main();
