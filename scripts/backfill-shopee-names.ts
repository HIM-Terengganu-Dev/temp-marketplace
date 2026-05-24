import { query } from '../src/lib/db';
import { getShopeeShopInfo, getValidShopeeToken } from '../src/lib/shopee-client';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        console.log('Querying connected Shopee shops from credentials.refresh_shopeeshops_token...');
        const result = await query(`
            SELECT shop_id, shop_name
            FROM credentials.refresh_shopeeshops_token
        `);

        console.log(`Found ${result.rows.length} connected Shopee shops in DB.`);
        if (result.rows.length === 0) {
            console.log("No Shopee shops to backfill.");
            process.exit(0);
        }

        for (const row of result.rows) {
            console.log(`\nProcessing shop ${row.shop_id} (current DB name: "${row.shop_name}")...`);
            try {
                const accessToken = await getValidShopeeToken(row.shop_id);
                const info = await getShopeeShopInfo(row.shop_id, accessToken);
                console.log(`Fetched real Shopee store name: "${info.shop_name}"`);

                if (info.shop_name && info.shop_name !== row.shop_name) {
                    await query(
                        'UPDATE credentials.refresh_shopeeshops_token SET shop_name = $1 WHERE shop_id = $2',
                        [info.shop_name, row.shop_id]
                    );
                    console.log(`Successfully updated database name to: "${info.shop_name}"`);
                } else {
                    console.log(`Name already matches or is empty. No update needed.`);
                }
            } catch (e) {
                console.error(`Error updating shop name for ${row.shop_id}:`, e);
            }
        }
        
        // Bulk update the credentials.daily_shopee_metrics table
        console.log('\nBulk updating credentials.daily_shopee_metrics table with beautiful names...');
        const bulkUpdateResult = await query(`
            UPDATE credentials.daily_shopee_metrics m
            SET shop_name = t.shop_name
            FROM credentials.refresh_shopeeshops_token t
            WHERE m.shop_id = t.shop_id;
        `);
        console.log(`Successfully completed daily metrics name backfill. Rows affected: ${bulkUpdateResult.rowCount || 0}`);
        
        process.exit(0);
    } catch (e) {
        console.error('Error in main:', e);
        process.exit(1);
    }
}

main();
