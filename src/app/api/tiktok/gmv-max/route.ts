import { NextResponse } from 'next/server';

// Configuration
const ADVERTISER_ID = '7505228077656621057';
const SHOP_ID = '7495609155379170274'; // Store ID
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
async function getCampaigns(accessToken: string, promotionType: string): Promise<Map<string, CampaignInfo>> {
    const campaigns = new Map<string, CampaignInfo>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: ADVERTISER_ID,
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

    if (!startDate || !endDate || !promotionType) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const accessToken = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN);

    if (!accessToken) {
        return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
    }

    try {
        // Step 1: Get campaign info for the requested promotion type
        const campaigns = await getCampaigns(accessToken, promotionType);
        console.log(`Found ${campaigns.size} campaigns for ${promotionType}`);

        // Step 2: Fetch report data (may contain all types due to API bug)
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

        // For Live GMV, also aggregate by account
        const accountBreakdown: Record<string, { cost: number; gmv: number; orders: number; campaigns: number }> = {};

        filteredList.forEach((item: any) => {
            const cost = parseFloat(item.metrics.cost || '0');
            const gmv = parseFloat(item.metrics.gross_revenue || '0');
            const orders = parseInt(item.metrics.orders || '0', 10);

            totalCost += cost;
            totalGMV += gmv;
            totalOrders += orders;

            // Get account name from campaign info
            const campaignInfo = campaigns.get(item.dimensions.campaign_id);
            const accountName = campaignInfo?.accountName || 'Other';

            if (!accountBreakdown[accountName]) {
                accountBreakdown[accountName] = { cost: 0, gmv: 0, orders: 0, campaigns: 0 };
            }
            accountBreakdown[accountName].cost += cost;
            accountBreakdown[accountName].gmv += gmv;
            accountBreakdown[accountName].orders += orders;
            accountBreakdown[accountName].campaigns += 1;
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

        return NextResponse.json({
            shopName: 'DrSamhanWellness',
            promotionType: promotionType,
            gmv: totalGMV,
            cost: totalCost,
            roi: roi,
            orderCount: totalOrders,
            campaignCount: filteredList.length,
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            // Include account breakdown for both LIVE and PRODUCT GMV Max
            accounts: accountsArray
        });

    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
