import { query } from '../src/lib/db';
import { fetchShopeeAdsSpendForDate, getValidShopeeToken } from '../src/lib/shopee-client';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        console.log('Querying connected Shopee shops from credentials.refresh_shopeeshops_token...');
        const result = await query(`
            SELECT shop_id, shop_name, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, updated_at
            FROM credentials.refresh_shopeeshops_token
            ORDER BY shop_name
        `);

        console.log(`Found ${result.rows.length} connected Shopee shops:`);
        if (result.rows.length === 0) {
            console.log("No Shopee shops connected.");
            process.exit(0);
        }

        for (const row of result.rows) {
            console.log(`\n==================================================`);
            console.log(`Shopee Shop: ${row.shop_name} (ID: ${row.shop_id})`);
            console.log(`==================================================`);
            
            // Get today's and yesterday's dates in KL timezone
            const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
            const yesterdayKL = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
            
            console.log(`Today (KL):     ${todayKL}`);
            console.log(`Yesterday (KL): ${yesterdayKL}`);

            try {
                const accessToken = await getValidShopeeToken(row.shop_id);
                console.log(`Token is valid. Access token prefix: ${accessToken.substring(0, 15)}...`);
                
                // Let's test yesterday
                console.log(`\nTesting Ads CPC API for YESTERDAY (${yesterdayKL})...`);
                const yesterdayResult = await fetchShopeeAdsSpendForDate(row.shop_id, accessToken, yesterdayKL);
                console.log(`Yesterday Ads Result:`, yesterdayResult);

                // Let's test today
                console.log(`\nTesting Ads CPC API for TODAY (${todayKL})...`);
                const todayResult = await fetchShopeeAdsSpendForDate(row.shop_id, accessToken, todayKL);
                console.log(`Today Ads Result:`, todayResult);
            } catch (e) {
                console.error(`Error testing ads for shop ${row.shop_id}:`, e);
            }
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error in main:', e);
        process.exit(1);
    }
}

main();
