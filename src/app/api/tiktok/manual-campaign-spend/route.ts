import { NextResponse } from 'next/server';

// Shop to Account mapping
const SHOP_TO_ACCOUNT: Record<string, {
    name: string;
    advertiserId: string;
    accessTokenEnv: string;
}> = {
    '1': {
        name: 'Account 1',
        advertiserId: '7505228077656621057',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN'
    },
    '2': {
        name: 'Account 2',
        advertiserId: '7404387549454008336',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN'
    }
};

// Shop names
const SHOP_NAMES: Record<string, string> = {
    '1': 'DrSamhanWellness',
    '2': 'HIM CLINIC'
};

const BASE_URL = 'https://business-api.tiktok.com';
const API_VERSION = 'v1.3';

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

interface AccountSpendResult {
    accountName: string;
    advertiserId: string;
    totalSpend: number;
    totalBilledCost: number;
    totalImpressions: number;
    totalClicks: number;
    campaignCount: number;
    avgCPM: number;
    avgCPC: number;
}

/**
 * Fetch GMV Max campaign IDs for an advertiser to exclude from manual campaigns
 */
async function getGMVMaxCampaignIds(advertiserId: string, accessToken: string): Promise<Set<string>> {
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
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch {
                break;
            }
        }
    }

    return gmvMaxIds;
}

/**
 * Fetch integrated report data for an advertiser
 */
async function fetchIntegratedReport(
    advertiserId: string,
    accessToken: string,
    startDate: string,
    endDate: string,
    gmvMaxIds: Set<string>
): Promise<AccountSpendResult | null> {
    const allReportData: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: advertiserId,
            report_type: 'BASIC',
            data_level: 'AUCTION_CAMPAIGN',
            dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
            metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc', 'ctr']),
            start_date: startDate,
            end_date: endDate,
            page: page.toString(),
            page_size: '1000'
        });

        const url = `${BASE_URL}/open_api/${API_VERSION}/report/integrated/get/?${params.toString()}`;

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
                console.error('Integrated report error:', data);
                break;
            }

            const list = data.data?.list || [];
            allReportData.push(...list);

            const pageInfo = data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            break;
        }
    }

    // Filter out GMV Max campaigns - keep only manual/bidding campaigns
    const manualCampaignData = allReportData.filter(item => {
        const campaignId = item.dimensions?.campaign_id;
        return campaignId && !gmvMaxIds.has(campaignId);
    });

    // Aggregate totals
    let totalSpend = 0;
    let totalBilledCost = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    const uniqueCampaigns = new Set<string>();

    manualCampaignData.forEach(item => {
        const campaignId = item.dimensions.campaign_id;
        uniqueCampaigns.add(campaignId);

        totalSpend += parseFloat(item.metrics.spend || 0);
        totalBilledCost += parseFloat(item.metrics.billed_cost || 0);
        totalImpressions += parseInt(item.metrics.impressions || 0, 10);
        totalClicks += parseInt(item.metrics.clicks || 0, 10);
    });

    return {
        accountName: '',
        advertiserId,
        totalSpend,
        totalBilledCost,
        totalImpressions,
        totalClicks,
        campaignCount: uniqueCampaigns.size,
        avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumber = searchParams.get('shopNumber') || '1'; // Default to shop 1

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    // Get account configuration for the selected shop
    const accountConfig = SHOP_TO_ACCOUNT[shopNumber];
    if (!accountConfig) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumber}. Valid options: 1, 2` }, { status: 400 });
    }

    const shopName = SHOP_NAMES[shopNumber] || 'Unknown Shop';

    const accessToken = cleanEnv(process.env[accountConfig.accessTokenEnv]);

    if (!accessToken) {
        return NextResponse.json({ error: `Missing Access Token for ${shopName}` }, { status: 500 });
    }

    try {
        // Get GMV Max campaign IDs to exclude
        const gmvMaxIds = await getGMVMaxCampaignIds(accountConfig.advertiserId, accessToken);

        // Fetch integrated report
        const result = await fetchIntegratedReport(
            accountConfig.advertiserId,
            accessToken,
            startDate,
            endDate,
            gmvMaxIds
        );

        if (!result) {
            return NextResponse.json({
                shopName: shopName,
                metricType: 'manual_campaign_spend',
                totalSpend: 0,
                totalBilledCost: 0,
                totalImpressions: 0,
                totalClicks: 0,
                campaignCount: 0,
                avgCPM: 0,
                avgCPC: 0,
                currency: 'MYR',
                dateRange: { start: startDate, end: endDate },
                accounts: []
            });
        }

        result.accountName = accountConfig.name;

        return NextResponse.json({
            shopName: shopName,
            metricType: 'manual_campaign_spend',
            totalSpend: result.totalSpend,
            totalBilledCost: result.totalBilledCost,
            totalImpressions: result.totalImpressions,
            totalClicks: result.totalClicks,
            campaignCount: result.campaignCount,
            avgCPM: result.avgCPM,
            avgCPC: result.avgCPC,
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            accounts: [result]
        });
    } catch (error: any) {
        console.error(`Error processing ${shopName}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
