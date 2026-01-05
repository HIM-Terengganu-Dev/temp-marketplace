import { NextResponse } from 'next/server';

// Configuration
const ADVERTISER_ID = '7505228077656621057';
const SHOP_ID = '7495609155379170274';
const BASE_URL = 'https://business-api.tiktok.com';
const API_VERSION = 'v1.3';

// Manual campaign accounts
const MANUAL_ACCOUNTS = [
    {
        name: 'Account 1',
        advertiserId: '7505228077656621057',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN'
    },
    {
        name: 'Account 2',
        advertiserId: '7404387549454008336',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN'
    }
];

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

// ---------- GMV Calculation (from Shop API) ----------
async function fetchGMVFromOrders(accessToken: string, startDate: string, endDate: string): Promise<number> {
    const shopAppKey = cleanEnv(process.env.TIKTOK_SHOP1_APP_KEY);
    const shopAppSecret = cleanEnv(process.env.TIKTOK_SHOP1_APP_SECRET);
    const shopId = cleanEnv(process.env.TIKTOK_SHOP1_SHOP_ID);
    const shopCipher = cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER);

    if (!shopAppKey || !shopAppSecret || !shopId || !shopCipher) {
        console.error('Missing Shop API credentials');
        return 0;
    }

    // Use internal API to get GMV
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tiktok/gmv?startDate=${startDate}&endDate=${endDate}`,
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
async function getGMVMaxCampaignIds(accessToken: string, promotionType: string): Promise<Set<string>> {
    const campaignIds = new Set<string>();
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

async function fetchGMVMaxCost(accessToken: string, startDate: string, endDate: string, promotionType: string): Promise<number> {
    const validCampaignIds = await getGMVMaxCampaignIds(accessToken, promotionType);

    const params = new URLSearchParams({
        advertiser_id: ADVERTISER_ID,
        store_ids: JSON.stringify([SHOP_ID]),
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

async function fetchManualCampaignSpend(startDate: string, endDate: string): Promise<number> {
    let totalSpend = 0;

    for (const account of MANUAL_ACCOUNTS) {
        const accessToken = cleanEnv(process.env[account.accessTokenEnv]);
        if (!accessToken) continue;

        try {
            const gmvMaxIds = await getGMVMaxCampaignIdsForAccount(account.advertiserId, accessToken);

            // Fetch integrated report
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const params = new URLSearchParams({
                    advertiser_id: account.advertiserId,
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
            console.error(`Error fetching manual spend for ${account.name}:`, error);
        }
    }

    return totalSpend;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    const accessToken = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN);

    if (!accessToken) {
        return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
    }

    try {
        // Fetch all components in parallel where possible
        const [liveGMVMaxCost, productGMVMaxCost, manualCampaignSpend] = await Promise.all([
            fetchGMVMaxCost(accessToken, startDate, endDate, 'LIVE_GMV_MAX'),
            fetchGMVMaxCost(accessToken, startDate, endDate, 'PRODUCT_GMV_MAX'),
            fetchManualCampaignSpend(startDate, endDate)
        ]);

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
            shopName: 'DrSamhanWellness',
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
