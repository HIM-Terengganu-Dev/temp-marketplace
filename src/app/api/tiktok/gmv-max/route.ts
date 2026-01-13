import { NextResponse } from 'next/server';

// Shop configuration
const SHOPS: Record<string, {
    name: string;
    shopId: string;
    advertiserId: string;
    accessTokenEnv: string;
    hasGMVCampaigns: boolean; // Whether this shop has GMV campaigns activated
}> = {
    '1': {
        name: 'DrSamhanWellness',
        shopId: '7495609155379170274',
        advertiserId: '7505228077656621057',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN',
        hasGMVCampaigns: true
    },
    '2': {
        name: 'HIM CLINIC',
        shopId: '7495102143139318172',
        advertiserId: '7404387549454008336',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN',
        hasGMVCampaigns: false // Shop 2 doesn't have GMV campaigns
    }
};

const BASE_URL = 'https://business-api.tiktok.com';
const API_VERSION = 'v1.3';

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

interface CampaignInfo {
    id: string;
    name: string;
    accountName: string;
}

// Helper to extract account name from campaign name (inside square brackets)
function extractAccountName(campaignName: string): string {
    const match = campaignName.match(/\[([^\]]+)\]/);
    return match ? match[1] : 'Other';
}

// Helper to fetch campaign info for a specific promotion type
async function getCampaigns(accessToken: string, advertiserId: string, promotionType: string): Promise<Map<string, CampaignInfo>> {
    const campaigns = new Map<string, CampaignInfo>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: advertiserId,
            filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
            page: page.toString(),
            page_size: '100'
        });

        const url = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/campaign/get/?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.code !== 0) {
            console.error('Campaign fetch error:', data);
            break;
        }

        const list = data.data?.list || [];
        list.forEach((c: any) => {
            campaigns.set(c.campaign_id, {
                id: c.campaign_id,
                name: c.campaign_name,
                accountName: extractAccountName(c.campaign_name)
            });
        });

        const pageInfo = data.data?.page_info;
        if (page >= (pageInfo?.total_page || 1)) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return campaigns;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const promotionType = searchParams.get('promotion_type'); // PRODUCT_GMV_MAX or LIVE_GMV_MAX
    const shopNumber = searchParams.get('shopNumber') || '1'; // Default to shop 1

    if (!startDate || !endDate || !promotionType) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get shop configuration
    const shopConfig = SHOPS[shopNumber];
    if (!shopConfig) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumber}. Valid options: 1, 2` }, { status: 400 });
    }

    // If shop doesn't have GMV campaigns, return zeros
    if (!shopConfig.hasGMVCampaigns) {
        return NextResponse.json({
            shopName: shopConfig.name,
            promotionType: promotionType,
            gmv: 0,
            cost: 0,
            roi: 0,
            orderCount: 0,
            campaignCount: 0,
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            accounts: [],
            campaigns: []
        });
    }

    const accessToken = cleanEnv(process.env[shopConfig.accessTokenEnv]);

    if (!accessToken) {
        return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
    }

    try {
        // Step 1: Get campaign info for the requested promotion type
        const campaigns = await getCampaigns(accessToken, shopConfig.advertiserId, promotionType);
        console.log(`Found ${campaigns.size} campaigns for ${promotionType}`);

        // Step 2: Fetch report data (may contain all types due to API bug)
        const queryParams = new URLSearchParams({
            advertiser_id: shopConfig.advertiserId,
            store_ids: JSON.stringify([shopConfig.shopId]),
            gmv_max_promotion_type: promotionType,
            dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
            metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi', 'cost_per_order', 'net_cost']),
            start_date: startDate,
            end_date: endDate,
            page_size: '1000'
        });

        const url = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.code !== 0) {
            console.error('TikTok GMV Max API Error:', data);
            throw new Error(data.message || 'TikTok GMV Max API Error');
        }

        const list = data.data?.list || [];

        // Step 3: Filter report data to only include campaigns of the correct type
        const filteredList = list.filter((item: any) =>
            campaigns.has(item.dimensions.campaign_id)
        );

        console.log(`Filtered from ${list.length} to ${filteredList.length} records for ${promotionType}`);

        // Step 4: Aggregate filtered data
        let totalCost = 0;
        let totalGMV = 0;
        let totalOrders = 0;

        // Aggregate by account
        const accountBreakdown: Record<string, { cost: number; gmv: number; orders: number; campaigns: number }> = {};
        
        // Aggregate by campaign (for campaign-level granulation)
        const campaignBreakdown: Record<string, { cost: number; gmv: number; orders: number; campaignName: string; campaignId: string }> = {};

        filteredList.forEach((item: any) => {
            const cost = parseFloat(item.metrics.cost || '0');
            const gmv = parseFloat(item.metrics.gross_revenue || '0');
            const orders = parseInt(item.metrics.orders || '0', 10);
            const campaignId = item.dimensions.campaign_id;

            totalCost += cost;
            totalGMV += gmv;
            totalOrders += orders;

            // Get campaign info
            const campaignInfo = campaigns.get(campaignId);
            const accountName = campaignInfo?.accountName || 'Other';
            const campaignName = campaignInfo?.name || `Campaign ${campaignId}`;

            // Aggregate by account
            if (!accountBreakdown[accountName]) {
                accountBreakdown[accountName] = { cost: 0, gmv: 0, orders: 0, campaigns: 0 };
            }
            accountBreakdown[accountName].cost += cost;
            accountBreakdown[accountName].gmv += gmv;
            accountBreakdown[accountName].orders += orders;
            accountBreakdown[accountName].campaigns += 1;

            // Aggregate by campaign
            if (!campaignBreakdown[campaignId]) {
                campaignBreakdown[campaignId] = { 
                    cost: 0, 
                    gmv: 0, 
                    orders: 0, 
                    campaignName: campaignName,
                    campaignId: campaignId
                };
            }
            campaignBreakdown[campaignId].cost += cost;
            campaignBreakdown[campaignId].gmv += gmv;
            campaignBreakdown[campaignId].orders += orders;
        });

        const roi = totalCost > 0 ? totalGMV / totalCost : 0;

        // Convert accountBreakdown to array with ROI calculated
        const accountsArray = Object.entries(accountBreakdown).map(([name, data]) => ({
            name,
            cost: data.cost,
            gmv: data.gmv,
            orders: data.orders,
            campaigns: data.campaigns,
            roi: data.cost > 0 ? data.gmv / data.cost : 0
        })).sort((a, b) => b.gmv - a.gmv); // Sort by GMV descending

        // Convert campaignBreakdown to array with ROI calculated, including account name
        const campaignsArray = Object.values(campaignBreakdown).map((data) => {
            const accountName = extractAccountName(data.campaignName);
            return {
                campaignId: data.campaignId,
                campaignName: data.campaignName,
                accountName: accountName,
                cost: data.cost,
                gmv: data.gmv,
                orders: data.orders,
                roi: data.cost > 0 ? data.gmv / data.cost : 0
            };
        }).sort((a, b) => {
            // First sort by account name, then by GMV descending
            if (a.accountName !== b.accountName) {
                return a.accountName.localeCompare(b.accountName);
            }
            return b.gmv - a.gmv;
        });

        return NextResponse.json({
            shopName: shopConfig.name,
            promotionType: promotionType,
            gmv: totalGMV,
            cost: totalCost,
            roi: roi,
            orderCount: totalOrders,
            campaignCount: filteredList.length,
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            // Include account breakdown for both LIVE and PRODUCT GMV Max
            accounts: accountsArray,
            // Include campaign breakdown for campaign-level granulation
            campaigns: campaignsArray
        });

    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
