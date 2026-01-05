const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const accessToken = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN);
const ADVERTISER_ID = '7505228077656621057';
const SHOP_ID = '7495609155379170274';

const baseUrl = 'https://business-api.tiktok.com';
const version = 'v1.3';

const startDate = '2026-01-01';
const endDate = '2026-01-01';

// Helper to extract account name from campaign name
function extractAccountName(campaignName) {
    const match = campaignName.match(/\[([^\]]+)\]/);
    return match ? match[1] : 'Other';
}

// Get campaigns for a specific promotion type
async function getCampaigns(promotionType) {
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

        try {
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
        } catch (error) {
            console.error('Error fetching campaigns:', error.message);
            break;
        }
    }

    return campaigns;
}

// Fetch Gross Revenue report
async function fetchGrossRevenue(promotionType) {
    console.log(`\n=== Fetching Gross Revenue for ${promotionType} ===`);
    console.log(`Date: ${startDate} to ${endDate}\n`);

    // Step 1: Get campaign info
    const campaigns = await getCampaigns(promotionType);
    console.log(`Found ${campaigns.size} campaigns for ${promotionType}`);

    if (campaigns.size === 0) {
        console.log(`No campaigns found for ${promotionType}`);
        return {
            promotionType,
            campaignCount: 0,
            grossRevenue: 0,
            cost: 0,
            orders: 0,
            roi: 0,
            accounts: []
        };
    }

    // Step 2: Fetch report data
    const queryParams = new URLSearchParams({
        advertiser_id: ADVERTISER_ID,
        store_ids: JSON.stringify([SHOP_ID]),
        gmv_max_promotion_type: promotionType,
        dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
        metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi', 'cost_per_order', 'net_cost']),
        start_date: startDate,
        end_date: endDate,
        page_size: '1000'
    });

    const url = `${baseUrl}/open_api/${version}/gmv_max/report/get/?${queryParams.toString()}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) {
            console.error('API Error:', response.data);
            return { error: response.data };
        }

        const list = response.data.data?.list || [];
        console.log(`Report returned ${list.length} records (before filtering)`);

        // Step 3: Filter to only include campaigns of the correct type
        const filteredList = list.filter(item => campaigns.has(item.dimensions.campaign_id));
        console.log(`After filtering: ${filteredList.length} records\n`);

        // Step 4: Aggregate data
        let totalCost = 0;
        let totalGrossRevenue = 0;
        let totalOrders = 0;

        // Aggregate by account
        const accountBreakdown = {};

        filteredList.forEach(item => {
            const cost = parseFloat(item.metrics.cost || '0');
            const grossRevenue = parseFloat(item.metrics.gross_revenue || '0');
            const orders = parseInt(item.metrics.orders || '0', 10);

            totalCost += cost;
            totalGrossRevenue += grossRevenue;
            totalOrders += orders;

            // Get account name from campaign info
            const campaignInfo = campaigns.get(item.dimensions.campaign_id);
            const accountName = campaignInfo?.accountName || 'Other';

            if (!accountBreakdown[accountName]) {
                accountBreakdown[accountName] = {
                    cost: 0,
                    grossRevenue: 0,
                    orders: 0,
                    campaigns: new Set()
                };
            }
            accountBreakdown[accountName].cost += cost;
            accountBreakdown[accountName].grossRevenue += grossRevenue;
            accountBreakdown[accountName].orders += orders;
            accountBreakdown[accountName].campaigns.add(item.dimensions.campaign_id);
        });

        // Convert account breakdown to array
        const accountsArray = Object.entries(accountBreakdown).map(([name, data]) => ({
            accountName: name,
            cost: data.cost,
            grossRevenue: data.grossRevenue,
            orders: data.orders,
            campaignCount: data.campaigns.size,
            roi: data.cost > 0 ? data.grossRevenue / data.cost : 0
        })).sort((a, b) => b.grossRevenue - a.grossRevenue);

        const roi = totalCost > 0 ? totalGrossRevenue / totalCost : 0;

        const results = {
            promotionType,
            date: startDate,
            campaignCount: filteredList.length,
            grossRevenue: totalGrossRevenue,
            cost: totalCost,
            orders: totalOrders,
            roi: roi,
            accounts: accountsArray
        };

        console.log('=== SUMMARY ===');
        console.log(`Total Gross Revenue: MYR ${totalGrossRevenue.toFixed(2)}`);
        console.log(`Total Cost: MYR ${totalCost.toFixed(2)}`);
        console.log(`Total Orders: ${totalOrders}`);
        console.log(`ROI: ${roi.toFixed(2)}x`);
        console.log(`\n=== BREAKDOWN BY ACCOUNT ===`);
        accountsArray.forEach(account => {
            console.log(`\n${account.accountName}:`);
            console.log(`  Gross Revenue: MYR ${account.grossRevenue.toFixed(2)}`);
            console.log(`  Cost: MYR ${account.cost.toFixed(2)}`);
            console.log(`  Orders: ${account.orders}`);
            console.log(`  Campaigns: ${account.campaignCount}`);
            console.log(`  ROI: ${account.roi.toFixed(2)}x`);
        });

        return results;

    } catch (error) {
        console.error('Exception:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return { error: error.message };
    }
}

async function main() {
    console.log('========================================');
    console.log('Gross Revenue Search - January 1, 2026');
    console.log('========================================\n');

    const results = {};

    // Fetch for LIVE GMV MAX
    results.LIVE_GMV_MAX = await fetchGrossRevenue('LIVE_GMV_MAX');

    console.log('\n' + '='.repeat(50) + '\n');

    // Fetch for PRODUCT GMV MAX
    results.PRODUCT_GMV_MAX = await fetchGrossRevenue('PRODUCT_GMV_MAX');

    console.log('\n========================================');
    console.log('Complete Results:');
    console.log('========================================');
    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);

