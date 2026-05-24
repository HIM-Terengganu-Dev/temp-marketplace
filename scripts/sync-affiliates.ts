import * as dotenv from 'dotenv';
import { getAllShopCredentials } from '../src/lib/tiktok-shop-credentials';
import { syncAffiliateMetricsForDate } from '../src/lib/metrics-fetcher';
import { query, pool } from '../src/lib/db';

dotenv.config();

/**
 * Script to manually sync TikTok Shop Affiliate Performance for a selected date
 * Usage:
 *   npx tsx scripts/sync-affiliates.ts [date]
 * Example:
 *   npx tsx scripts/sync-affiliates.ts 2026-05-24
 */
async function main() {
    const args = process.argv.slice(2);
    let dateStr = args[0];

    // Default to today in KL time if not provided
    if (!dateStr) {
        dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    }

    console.log(`\n=============================================================`);
    console.log(`🚀 SYNCING TIKTOK SHOP CREATOR AFFILIATE METRICS`);
    console.log(`📅 Target Date: ${dateStr}`);
    console.log(`=============================================================\n`);

    try {
        const shops = await getAllShopCredentials();
        console.log(`Found ${shops.length} active TikTok Shop credentials.\n`);

        for (const shop of shops) {
            const shopNumber = shop.shop_number;
            console.log(`-------------------------------------------------------------`);
            console.log(`Syncing Affiliates for Shop ${shopNumber}: ${shop.shop_name}`);
            console.log(`-------------------------------------------------------------`);
            
            await syncAffiliateMetricsForDate(shopNumber, dateStr);
        }

        console.log(`\n=============================================================`);
        console.log(`🎉 Sync Completed successfully!`);
        console.log(`=============================================================\n`);

    } catch (e: any) {
        console.error(`❌ Global sync error:`, e.message);
    } finally {
        await pool.end();
    }
    process.exit(0);
}

main();
