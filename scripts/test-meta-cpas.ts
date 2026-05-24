import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const SHOPEE_SHOPS = [
    { id: 1298030530, name: 'HIM by Dr Samhan', envVar: 'SHOPEE_FB_AD_ACCOUNT_1298030530' },
    { id: 1077500606, name: 'HIM by Dr Samhan 1', envVar: 'SHOPEE_FB_AD_ACCOUNT_1077500606' },
    { id: 1256177782, name: 'HIM by Dr Samhan 2', envVar: 'SHOPEE_FB_AD_ACCOUNT_1256177782' },
    { id: 1290223366, name: 'him.drsamhan4', envVar: 'SHOPEE_FB_AD_ACCOUNT_1290223366' }
];

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

        if (!adAccountId.startsWith('act_')) {
            adAccountId = `act_${adAccountId}`;
        }

        anyConfigured = true;
        console.log(`Mapped Ad Account ID: ${adAccountId}`);


        for (const date of [yesterdayKL, todayKL]) {
            console.log(`  Querying spend for ${date}...`);
            try {
                const timeRange = JSON.stringify({ since: date, until: date });
                const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?access_token=${accessToken}&level=account&fields=spend&time_range=${encodeURIComponent(timeRange)}`;
                
                const response = await axios.get(url);
                const data = response.data;
                const insights = data.data || [];
                
                if (insights.length > 0 && insights[0].spend) {
                    const spend = parseFloat(insights[0].spend);
                    console.log(`  ✅ SUCCESS: RM ${spend.toFixed(2)} spend found`);
                } else {
                    console.log(`  ℹ️ INFO: No spend recorded (RM 0.00) or inactive for this day`);
                }
            } catch (error: any) {
                console.error(`  ❌ ERROR: Failed to retrieve spend for ${date}`);
                if (error.response) {
                    console.error(`     Response Code: ${error.response.status}`);
                    console.error(`     Error Message:`, error.response.data?.error?.message || error.response.statusText);
                } else {
                    console.error(`     Message: ${error.message}`);
                }
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
