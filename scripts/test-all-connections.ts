import { fetchShopGMV, fetchShopROAS, SHOPS } from '../src/lib/metrics-fetcher';
import { getConnectedShopeeShops, getValidShopeeToken, getShopeeShopInfo } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    console.log('==================================================');
    console.log('     SHOP CONNECTION & CREDENTIALS CHECKER        ');
    console.log('==================================================\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // 1. Check TikTok Shop Connections
    console.log('--- Checking TikTok Shop Connections ---');
    for (const [key, shop] of Object.entries(SHOPS)) {
        const shopNum = parseInt(key, 10);
        console.log(`\nTesting TikTok Shop #${shopNum}: ${shop.name} (ID: ${shop.shopId})`);
        try {
            // Test GMV endpoint
            const gmvRes = await fetchShopGMV(shopNum, dateStr, dateStr);
            console.log(`  ✓ GMV API Connection successful (Shop Name: "${gmvRes.shopName}")`);
            
            // Test Ads API Connection
            const roasRes = await fetchShopROAS(shopNum, dateStr, dateStr);
            console.log(`  ✓ Ads API Connection successful (Ad Spend: RM ${roasRes.totalAdsSpend})`);
        } catch (e: any) {
            console.log(`  ❌ TikTok Shop #${shopNum} failed:`, e.message || e);
        }
    }

    // 2. Check Shopee Shop Connections
    console.log('\n--- Checking Shopee Shop Connections ---');
    try {
        const shopeeShops = await getConnectedShopeeShops();
        console.log(`Found ${shopeeShops.length} Shopee shops in database.`);
        for (const shop of shopeeShops) {
            console.log(`\nTesting Shopee Shop ID: ${shop.shop_id} (${shop.shop_name})`);
            try {
                // Get valid token (auto-refreshes if needed)
                const token = await getValidShopeeToken(shop.shop_id);
                console.log('  ✓ Token validation/refresh successful.');
                
                // Test fetching shop info
                const info = await getShopeeShopInfo(shop.shop_id, token);
                console.log(`  ✓ Shopee API Connection successful (Fetched Name: "${info.shop_name}")`);
            } catch (e: any) {
                console.log(`  ❌ Shopee Shop ${shop.shop_id} failed:`, e.message || e);
            }
        }
    } catch (e: any) {
        console.log('  ❌ Failed to retrieve Shopee shops from DB:', e.message || e);
    }
    
    console.log('\n==================================================');
    process.exit(0);
}

main().catch(console.error);
