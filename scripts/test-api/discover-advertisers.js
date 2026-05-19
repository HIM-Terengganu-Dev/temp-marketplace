const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

async function discoverAdvertisers(tokenName) {
    const token = cleanEnv(process.env[tokenName]);
    if (!token) {
        console.log(`❌ No token found for ${tokenName} in .env`);
        return;
    }

    console.log(`🔍 Checking advertisers for ${tokenName}...`);
    
    try {
        const response = await axios.get('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/', {
            headers: {
                'Access-Token': token,
                'Content-Type': 'application/json'
            },
            params: {
                app_id: '7585065109681078273',
                secret: cleanEnv(process.env.TIKTOK_MARKETING_APP_SECRET)
            }
        });

        if (response.data.code !== 0) {
            console.error('❌ TikTok API Error:', response.data.message);
            return;
        }

        const advertisers = response.data.data.list || [];
        if (advertisers.length === 0) {
            console.log('⚠️ No advertiser accounts found for this token.');
        } else {
            console.log(`✅ Found ${advertisers.length} Advertiser Account(s):`);
            advertisers.forEach(acc => {
                console.log(`   - Name: ${acc.advertiser_name}`);
                console.log(`     ID:   ${acc.advertiser_id}`);
                console.log('     -------------------');
            });
        }
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

async function run() {
    console.log('--- TikTok Advertiser Discovery ---\n');
    await discoverAdvertisers('TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN');
    await discoverAdvertisers('TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN');
    await discoverAdvertisers('TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN');
}

run();
