const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.HP_marketplace_db_ddl;
if (!connectionString) {
    console.error('HP_marketplace_db_ddl is not set');
    process.exit(1);
}

async function main() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log("Querying daily_shopee_metrics for 2026-06-15...");
        const res = await client.query(`
            SELECT shop_id, shop_name, date::text, gmv, spend_before_tax, order_count, updated_at
            FROM credentials.daily_shopee_metrics
            WHERE date = '2026-06-15'::date
            ORDER BY shop_id;
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log("\nQuerying refresh_shopeeshops_token...");
        const resTokens = await client.query(`
            SELECT shop_id, shop_name, access_token_expires_at, updated_at
            FROM credentials.refresh_shopeeshops_token
            ORDER BY shop_id;
        `);
        console.log(JSON.stringify(resTokens.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
