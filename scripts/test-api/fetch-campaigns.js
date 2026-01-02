const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const accessToken = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN);
const ADVERTISER_ID = '7505228077656621057';

const baseUrl = 'https://business-api.tiktok.com';
const version = 'v1.3';

async function fetchCampaigns(promotionType) {
    console.log(`Fetching ${promotionType} campaigns...`);

    try {
        const params = new URLSearchParams({
            advertiser_id: ADVERTISER_ID,
            filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
            page: '1',
            page_size: '100'
        });

        const url = `${baseUrl}/open_api/${version}/gmv_max/campaign/get/?${params.toString()}`;
        console.log(`URL: ${url.substring(0, 150)}...`);

        const response = await axios.get(url, {
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) {
            console.error('Error:', response.data);
            return { error: response.data };
        }

        const list = response.data.data?.list || [];
        const pageInfo = response.data.data?.page_info;
        console.log(`Found ${list.length} campaigns (total: ${pageInfo?.total_number || '?'})`);

        return {
            count: list.length,
            totalNumber: pageInfo?.total_number,
            campaigns: list.map(c => ({
                id: c.campaign_id,
                name: c.campaign_name,
                status: c.operation_status
            }))
        };

    } catch (error) {
        console.error('Exception:', error.message);
        return { error: error.message };
    }
}

async function run() {
    const results = {};

    results.PRODUCT_GMV_MAX = await fetchCampaigns('PRODUCT_GMV_MAX');
    results.LIVE_GMV_MAX = await fetchCampaigns('LIVE_GMV_MAX');

    fs.writeFileSync(path.resolve(__dirname, 'campaign_list_results.json'), JSON.stringify(results, null, 2));
    console.log('Results saved to campaign_list_results.json');
}

run();
