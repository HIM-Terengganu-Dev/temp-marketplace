import { NextResponse } from 'next/server';

// Shop configuration
const SHOPS: Record<string, {
    name: string;
    shopId: string;
    advertiserId: string;
    accessTokenEnv: string;
    hasGMVCampaigns: boolean;
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
        hasGMVCampaigns: false
    }
};

const BASE_URL = 'https://business-api.tiktok.com';
const API_VERSION = 'v1.3';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

// ---------- GMV Calculation (from Shop API) ----------
async function fetchGMVFromOrders(shopNumber: string, startDate: string, endDate: string): Promise<number> {
    // Use internal API to get GMV with shop number
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}&shopNumber=${shopNumber}`,
            { method: 'GET' }
        );
        const data = await response.json();
        return data.gmv || 0;
    } catch (error) {
        console.error('Error fetching GMV:', error);
        return 0;
    }
}

// ---------- GMV Max Cost Calculation ----------
async function getGMVMaxCampaignIds(accessToken: string, advertiserId: string, promotionType: string): Promise<Set<string>> {
    const campaignIds = new Set<string>();
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

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.code !== 0) break;

            const list = data.data?.list || [];
            list.forEach((c: any) => campaignIds.add(c.campaign_id));

            const pageInfo = data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
            }
        } catch {
            break;
        }
    }

    return campaignIds;
}

async function fetchGMVMaxCost(accessToken: string, advertiserId: string, shopId: string, startDate: string, endDate: string, promotionType: string): Promise<number> {
    const validCampaignIds = await getGMVMaxCampaignIds(accessToken, advertiserId, promotionType);

    const params = new URLSearchParams({
        advertiser_id: advertiserId,
        store_ids: JSON.stringify([shopId]),
        dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
        metrics: JSON.stringify(['cost']),
        start_date: startDate,
        end_date: endDate,
        page_size: '1000'
    });

    const url = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${params.toString()}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.code !== 0) {
            console.error('GMV Max report error:', data);
            return 0;
        }

        const list = data.data?.list || [];
        const filteredList = list.filter((item: any) => validCampaignIds.has(item.dimensions.campaign_id));

        let totalCost = 0;
        filteredList.forEach((item: any) => {
            totalCost += parseFloat(item.metrics.cost || 0);
        });

        return totalCost;
    } catch (error) {
        console.error('Error fetching GMV Max cost:', error);
        return 0;
    }
}

// ---------- Manual Campaign Spend ----------
async function getGMVMaxCampaignIdsForAccount(advertiserId: string, accessToken: string): Promise<Set<string>> {
    const gmvMaxIds = new Set<string>();

    for (const promotionType of ['PRODUCT_GMV_MAX', 'LIVE_GMV_MAX']) {
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

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.code !== 0) break;

                const list = data.data?.list || [];
                list.forEach((c: any) => gmvMaxIds.add(c.campaign_id));

                const pageInfo = data.data?.page_info;
                if (page >= (pageInfo?.total_page || 1)) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch {
                break;
            }
        }
    }

    return gmvMaxIds;
}

async function fetchManualCampaignSpend(advertiserId: string, accessToken: string, startDate: string, endDate: string): Promise<number> {
    let totalSpend = 0;

    try {
        const gmvMaxIds = await getGMVMaxCampaignIdsForAccount(advertiserId, accessToken);

        // Fetch integrated report
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const params = new URLSearchParams({
                advertiser_id: advertiserId,
                report_type: 'BASIC',
                data_level: 'AUCTION_CAMPAIGN',
                dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
                metrics: JSON.stringify(['spend']),
                start_date: startDate,
                end_date: endDate,
                page: page.toString(),
                page_size: '1000'
            });

            const url = `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.code !== 0) break;

            const list = data.data?.list || [];

            // Filter out GMV Max campaigns
            list.forEach((item: any) => {
                const campaignId = item.dimensions?.campaign_id;
                if (campaignId && !gmvMaxIds.has(campaignId)) {
                    totalSpend += parseFloat(item.metrics.spend || 0);
                }
            });

            const pageInfo = data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
            }
        }
    } catch (error) {
        console.error(`Error fetching manual spend:`, error);
    }

    return totalSpend;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shopNumber = searchParams.get('shopNumber') || '1'; // Default to shop 1

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    // Get shop configuration
    const shopConfig = SHOPS[shopNumber];
    if (!shopConfig) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumber}. Valid options: 1, 2` }, { status: 400 });
    }

    const accessToken = cleanEnv(process.env[shopConfig.accessTokenEnv]);

    if (!accessToken) {
        return NextResponse.json({ error: `Missing Access Token for ${shopConfig.name}` }, { status: 500 });
    }

    try {
        let liveGMVMaxCost = 0;
        let productGMVMaxCost = 0;
        let manualCampaignSpend = 0;

        // For shops with GMV campaigns, fetch GMV Max costs
        if (shopConfig.hasGMVCampaigns) {
            // Fetch all components in parallel where possible
            [liveGMVMaxCost, productGMVMaxCost] = await Promise.all([
                fetchGMVMaxCost(accessToken, shopConfig.advertiserId, shopConfig.shopId, startDate, endDate, 'LIVE_GMV_MAX'),
                fetchGMVMaxCost(accessToken, shopConfig.advertiserId, shopConfig.shopId, startDate, endDate, 'PRODUCT_GMV_MAX')
            ]);
        }

        // Fetch manual campaign spend using shop-specific credentials
        manualCampaignSpend = await fetchManualCampaignSpend(shopConfig.advertiserId, accessToken, startDate, endDate);

        // GMV Max Cost = max(Live, Product) as per user requirement
        const gmvMaxCost = Math.max(liveGMVMaxCost, productGMVMaxCost);

        // Total Ads Spend = GMV Max Cost + Manual Campaign Spend
        const totalAdsSpend = gmvMaxCost + manualCampaignSpend;

        // Calculate SST (8%) and WHT (8%)
        const sst = totalAdsSpend * 0.08;
        const wht = totalAdsSpend * 0.08;
        const totalCostWithTaxes = totalAdsSpend + sst + wht;

        // Note: GMV needs to be fetched separately or passed from frontend
        // For now, we'll calculate ROAS on frontend where GMV is known

        return NextResponse.json({
            shopName: shopConfig.name,
            shopNumber: parseInt(shopNumber),
            metricType: 'roas',
            liveGMVMaxCost,
            productGMVMaxCost,
            gmvMaxCost,
            manualCampaignSpend,
            totalAdsSpend,
            sst,
            wht,
            totalCostWithTaxes,
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            // ROAS will be calculated on frontend: GMV / totalAdsSpend
            roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)'
        });

    } catch (error: any) {
        console.error('ROAS API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
