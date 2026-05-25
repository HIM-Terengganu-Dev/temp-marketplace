import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const SHOPEE_SHOPS = [
    { id: 1298030530, name: 'Himclinic Official', envVar: 'SHOPEE_FB_AD_ACCOUNT_1298030530' },
    { id: 1077500606, name: 'Him Clinic by Dr Samhan', envVar: 'SHOPEE_FB_AD_ACCOUNT_1077500606' },
    { id: 1256177782, name: 'Forhimclinic', envVar: 'SHOPEE_FB_AD_ACCOUNT_1256177782' },
    { id: 1290223366, name: 'Perkongsian Dr Samhan', envVar: 'SHOPEE_FB_AD_ACCOUNT_1290223366' }
];

import { fetchMetaCPASSpendForDate } from '../src/lib/shopee-client';

async function main() {
    console.log('\n================================================================');
    console.log('         META / FACEBOOK ADS CPAS INTEGRATION TESTING          ');
    console.log('================================================================\n');

    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
        console.error('❌ ERROR: FB_ACCESS_TOKEN is not defined in your .env file.');
        console.log('👉 Please open your .env file and set FB_ACCESS_TOKEN with your Meta access token.\n');
        process.exit(1);
    }

    console.log(`✓ FB_ACCESS_TOKEN is configured (Prefix: ${accessToken.substring(0, 15)}...)`);

    // Get yesterday and today in KL timezone (Asia/Kuala_Lumpur)
    const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const yesterdayKL = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    console.log(`KL Timezone Range: Yesterday (${yesterdayKL}) to Today (${todayKL})\n`);

    let anyConfigured = false;

    for (const shop of SHOPEE_SHOPS) {
        let adAccountId = process.env[shop.envVar];
        console.log(`----------------------------------------------------------------`);
        console.log(`Shopee Shop: ${shop.name} (ID: ${shop.id})`);
        console.log(`Env Variable: ${shop.envVar}`);
        
        if (!adAccountId) {
            console.log(`⚠️ Status: UNCONFIGURED (No Meta ad account ID defined in .env)`);
            continue;
        }

        anyConfigured = true;
        console.log(`Mapped Ad Account ID: ${adAccountId}`);

        for (const date of [yesterdayKL, todayKL]) {
            console.log(`\n  --- Querying spend for date: ${date} ---`);
            try {
                const spend = await fetchMetaCPASSpendForDate(shop.id, date);
                console.log(`  ✅ RESULT: RM ${spend.toFixed(2)}`);
            } catch (error: any) {
                console.error(`  ❌ ERROR: Failed to retrieve spend for ${date}:`, error.message);
            }
        }
    }

    console.log('\n================================================================');
    if (!anyConfigured) {
        console.log('⚠️ NEXT STEPS: Add at least one ad account mapping to your .env file');
        console.log('e.g., SHOPEE_FB_AD_ACCOUNT_1298030530="act_xxxxxxxxxxxxxxx"');
    } else {
        console.log('🎉 Verification completed.');
    }
    console.log('================================================================\n');
}

main().catch(err => {
    console.error('Fatal testing error:', err);
    process.exit(1);
});
