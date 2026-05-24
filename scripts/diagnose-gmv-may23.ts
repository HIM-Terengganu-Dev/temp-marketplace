import * as dotenv from 'dotenv';
import { query, pool } from '../src/lib/db';

dotenv.config();

const SHOP_ID = 1298030530;
const DATE = '2026-05-23';

// Correct values as confirmed by the user via Shopee Seller Centre / Business Insights
// Investigation summary:
// - API returns 79 total orders on May 23 by create_time
// - 66 are "active" (excl. CANCELLED/UNPAID/TO_RETURN) with item_subtotal = RM 8,921
// - Seller Centre shows 67 orders / RM 8,886 (RM 35 less)
// - The RM 35 discrepancy is due to Shopee's internal "Sales" calculation which includes
//   the UNPAID order at a net value, and may use a different price basis for streaming orders.
// - We accept the Seller Centre as source of truth and store the confirmed values.
const CORRECT_GMV = 8886.00;
const CORRECT_ORDER_COUNT = 67;

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Correcting GMV for HIM by Dr Samhan on ${DATE}`);
    console.log(`New values: GMV = RM ${CORRECT_GMV.toFixed(2)}, Orders = ${CORRECT_ORDER_COUNT}`);
    console.log(`${'='.repeat(60)}\n`);

    const current = await query(
        `SELECT gmv, order_count, spend_before_tax, cpas_spend, shopee_cpc_spend, updated_at 
         FROM credentials.daily_shopee_metrics WHERE shop_id = $1 AND date = $2`,
        [SHOP_ID, DATE]
    );

    if (current.rows[0]) {
        const r = current.rows[0];
        console.log(`Current values: GMV=RM ${parseFloat(r.gmv).toFixed(2)}, Orders=${r.order_count}`);
    }

    const result = await query(
        `UPDATE credentials.daily_shopee_metrics 
         SET gmv = $1, order_count = $2, updated_at = CURRENT_TIMESTAMP
         WHERE shop_id = $3 AND date = $4
         RETURNING *`,
        [CORRECT_GMV, CORRECT_ORDER_COUNT, SHOP_ID, DATE]
    );

    if (result.rows.length > 0) {
        const r = result.rows[0];
        console.log(`✅ Updated: GMV=RM ${parseFloat(r.gmv).toFixed(2)}, Orders=${r.order_count}`);
    } else {
        console.log(`⚠️  No record found, nothing updated.`);
    }

    await pool.end();
    process.exit(0);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
