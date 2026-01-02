const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const accessToken = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN);
const ADVERTISER_ID = '7505228077656621057';
const SHOP_ID = '7495609155379170274';

const baseUrl = 'https://business-api.tiktok.com';
const version = 'v1.3';

const startDate = '2025-12-25';
const endDate = '2025-12-25';

// Step 1: Fetch campaign IDs for a specific promotion type
async function getCampaignIds(promotionType) {
    const campaignIds = new Set();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: ADVERTISER_ID,
            filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
            page: page.toString(),
            page_size: '100'
        });

        const url = `${baseUrl}/open_api/${version}/gmv_max/campaign/get/?${params.toString()}`;

        const response = await axios.get(url, {
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) {
            console.error('Campaign fetch error:', response.data);
            break;
        }

        const list = response.data.data?.list || [];
        list.forEach(c => campaignIds.add(c.campaign_id));

        const pageInfo = response.data.data?.page_info;
        if (page >= (pageInfo?.total_page || 1)) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return campaignIds;
}

// Helper to extract account name from campaign name
function extractAccountName(campaignName) {
    const match = campaignName.match(/\[([^\]]+)\]/);
    return match ? match[1] : 'Other';
}

// Step 2: Fetch report and filter by campaign IDs
async function fetchGMVMax(promotionType) {
    console.log(`\nFetching ${promotionType}...`);

    // Get campaigns for this type (with names)
    const campaigns = new Map();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: ADVERTISER_ID,
            filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
            page: page.toString(),
            page_size: '100'
        });

        const url = `${baseUrl}/open_api/${version}/gmv_max/campaign/get/?${params.toString()}`;

        const response = await axios.get(url, {
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) break;

        const list = response.data.data?.list || [];
        list.forEach(c => {
            campaigns.set(c.campaign_id, {
                name: c.campaign_name,
                accountName: extractAccountName(c.campaign_name)
            });
        });

        const pageInfo = response.data.data?.page_info;
        if (page >= (pageInfo?.total_page || 1)) {
            hasMore = false;
        } else {
            page++;
        }
    }

    console.log(`Found ${campaigns.size} campaigns for ${promotionType}`);
    const validCampaignIds = await getCampaignIds(promotionType);
    console.log(`Found ${validCampaignIds.size} campaigns for ${promotionType}`);

    try {
        const queryParams = {
            advertiser_id: ADVERTISER_ID,
            store_ids: JSON.stringify([SHOP_ID]),
            // gmv_max_promotion_type: promotionType, // Removed as per server-side fix logic
            dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
            metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi', 'cost_per_order', 'net_cost']),
            start_date: startDate,
            end_date: endDate,
            page_size: '1000'
        };

        const queryString = Object.keys(queryParams)
            .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
            .join('&');

        const url = `${baseUrl}/open_api/${version}/gmv_max/report/get/?${queryString}`;

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

        const list = response.data.data.list || [];
        console.log(`Report returned ${list.length} records (before filtering)`);

        // Filter to only include campaigns of the correct type
        const filteredList = list.filter(item => validCampaignIds.has(item.dimensions.campaign_id));
        console.log(`After filtering: ${filteredList.length} records`);

        let totalCost = 0;
        let totalGMV = 0;
        let totalOrders = 0;

        filteredList.forEach(item => {
            totalCost += parseFloat(item.metrics.cost || 0);
            totalGMV += parseFloat(item.metrics.gross_revenue || 0);
            totalOrders += parseInt(item.metrics.orders || 0, 10);
        });

        const stats = {
            promotionType,
            campaignCount: filteredList.length,
            cost: totalCost,
            gmv: totalGMV,
            orders: totalOrders,
            roi: totalCost > 0 ? totalGMV / totalCost : 0
        };
        console.log(`Results:`, stats);
        return stats;

    } catch (error) {
        console.error('Exception:', error.message);
        return { error: error.message };
    }
}

async function runTests() {
    const results = {};

    results.PRODUCT_GMV_MAX = await fetchGMVMax('PRODUCT_GMV_MAX');
    results.LIVE_GMV_MAX = await fetchGMVMax('LIVE_GMV_MAX');

    fs.writeFileSync(path.resolve(__dirname, 'api_debug_results.json'), JSON.stringify(results, null, 2));
    console.log('\nResults saved to api_debug_results.json');
}

runTests();
