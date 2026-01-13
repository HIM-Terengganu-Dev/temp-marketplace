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
        // For LIVE GMV MAX, also fetch hourly data for live session breakdown
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

        // For LIVE GMV MAX, also fetch livestream room data for live session granularity
        let livestreamRoomData: any[] = [];
        if (promotionType === 'LIVE_GMV_MAX') {
            // Fetch room data using filtering with campaign_ids
            // Use campaign_id, room_id, and stat_time_day dimensions to match rooms to campaigns
            const campaignIds = Array.from(campaigns.keys());
            
            if (campaignIds.length > 0) {
                // Try with filtering first
                const filtering = {
                    campaign_ids: campaignIds
                };

                const roomParams = new URLSearchParams({
                    advertiser_id: shopConfig.advertiserId,
                    store_ids: JSON.stringify([shopConfig.shopId]),
                    gmv_max_promotion_type: promotionType,
                    dimensions: JSON.stringify(['campaign_id', 'room_id', 'stat_time_day']),
                    metrics: JSON.stringify([
                        'live_name',
                        'live_status',
                        'live_launched_time',
                        'live_duration',
                        'cost',
                        'net_cost',
                        'orders',
                        'cost_per_order',
                        'gross_revenue',
                        'roi',
                        'live_views',
                        'cost_per_live_view',
                        '10_second_live_views',
                        'cost_per_10_second_live_view',
                        'live_follows'
                    ]),
                    filtering: JSON.stringify(filtering),
                    start_date: startDate,
                    end_date: endDate,
                    page_size: '1000',
                    page: '1'
                });

                const roomUrl = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${roomParams.toString()}`;
                
                try {
                    console.log(`Fetching livestream room data for ${campaignIds.length} campaigns with filtering`);
                    console.log(`Campaign IDs:`, campaignIds);
                    const roomResponse = await fetch(roomUrl, {
                        method: 'GET',
                        headers: {
                            'Access-Token': accessToken,
                            'Content-Type': 'application/json'
                        }
                    });

                    const roomResult = await roomResponse.json();
                    if (roomResult.code === 0) {
                        const roomList = roomResult.data?.list || [];
                        console.log(`Received ${roomList.length} livestream room records with filtering`);
                        
                        // Convert campaign IDs to strings for comparison since API might return strings
                        const campaignIdSet = new Set(Array.from(campaigns.keys()).map(id => String(id)));
                        
                        if (roomList.length > 0) {
                            // Debug: Log sample room data structure
                            console.log('Sample room data:', JSON.stringify(roomList[0], null, 2));
                            console.log('Campaign IDs in campaigns Map:', Array.from(campaigns.keys()));
                            console.log('Sample room campaign_id:', roomList[0]?.dimensions?.campaign_id, 'Type:', typeof roomList[0]?.dimensions?.campaign_id);
                            
                            // Filter to only include campaigns of the correct type
                            livestreamRoomData = roomList.filter((item: any) => {
                                const roomCampaignId = String(item.dimensions?.campaign_id || '');
                                const matches = campaignIdSet.has(roomCampaignId);
                                if (!matches) {
                                    console.log(`Room campaign_id ${roomCampaignId} (${typeof item.dimensions?.campaign_id}) not found in campaigns set`);
                                }
                                return matches;
                            });
                            console.log(`Filtered to ${livestreamRoomData.length} records matching campaigns`);
                        } else {
                            console.log('No room data returned with filtering. Trying without filtering as fallback...');
                            // Try without filtering as fallback
                            const roomParamsNoFilter = new URLSearchParams({
                                advertiser_id: shopConfig.advertiserId,
                                store_ids: JSON.stringify([shopConfig.shopId]),
                                gmv_max_promotion_type: promotionType,
                                dimensions: JSON.stringify(['campaign_id', 'room_id', 'stat_time_day']),
                                metrics: JSON.stringify([
                                    'live_name',
                                    'live_status',
                                    'live_launched_time',
                                    'live_duration',
                                    'cost',
                                    'net_cost',
                                    'orders',
                                    'cost_per_order',
                                    'gross_revenue',
                                    'roi',
                                    'live_views',
                                    'cost_per_live_view',
                                    '10_second_live_views',
                                    'cost_per_10_second_live_view',
                                    'live_follows'
                                ]),
                                start_date: startDate,
                                end_date: endDate,
                                page_size: '1000',
                                page: '1'
                            });
                            
                            const roomUrlNoFilter = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${roomParamsNoFilter.toString()}`;
                            const roomResponseNoFilter = await fetch(roomUrlNoFilter, {
                                method: 'GET',
                                headers: {
                                    'Access-Token': accessToken,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            const roomResultNoFilter = await roomResponseNoFilter.json();
                            if (roomResultNoFilter.code === 0) {
                                const roomListNoFilter = roomResultNoFilter.data?.list || [];
                                console.log(`Received ${roomListNoFilter.length} records without filtering`);
                                if (roomListNoFilter.length > 0) {
                                    console.log('Sample room data (no filter):', JSON.stringify(roomListNoFilter[0], null, 2));
                                    // Filter to only include our campaigns
                                    livestreamRoomData = roomListNoFilter.filter((item: any) => {
                                        const roomCampaignId = String(item.dimensions?.campaign_id || '');
                                        return campaignIdSet.has(roomCampaignId);
                                    });
                                    console.log(`Filtered to ${livestreamRoomData.length} records matching campaigns (no filter approach)`);
                                }
                            } else {
                                console.error('Error fetching livestream room data without filter:', roomResultNoFilter);
                            }
                        }
                    } else {
                        console.error('Error fetching livestream room data:', roomResult);
                    }
                } catch (error) {
                    console.error('Error fetching livestream room data for live sessions:', error);
                    // Continue without room data if it fails
                }
            }
        }

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
            
            // For LIVE GMV MAX, attach livestream room data (live sessions) to each campaign
            let liveSessions: any[] = [];
            if (promotionType === 'LIVE_GMV_MAX' && livestreamRoomData.length > 0) {
                // Group by room_id to get individual livestream sessions
                const roomMap = new Map<string, {
                    roomId: string;
                    liveName: string;
                    liveStatus: string;
                    liveDuration: string;
                    launchedTime: string;
                    cost: number;
                    gmv: number;
                    orders: number;
                }>();

                // Convert campaign ID to string for comparison
                const campaignIdStr = String(data.campaignId);
                const campaignRooms = livestreamRoomData.filter((item: any) => {
                    const itemCampaignId = String(item.dimensions?.campaign_id || '');
                    return itemCampaignId === campaignIdStr;
                });
                
                console.log(`Campaign ${data.campaignId} (${data.campaignName}): Found ${campaignRooms.length} room records`);
                
                campaignRooms.forEach((item: any) => {
                        const roomId = item.dimensions.room_id;
                        // Use live_launched_time from metrics (this is the actual launched time)
                        const launchedTime = item.metrics.live_launched_time || item.dimensions.stat_time_day;
                        const cost = parseFloat(item.metrics.cost || '0');
                        const gmv = parseFloat(item.metrics.gross_revenue || '0');
                        const orders = parseInt(item.metrics.orders || '0', 10);
                        const liveName = item.metrics.live_name || '';
                        const liveStatus = item.metrics.live_status || '';
                        const liveDuration = item.metrics.live_duration || '';

                        if (!roomMap.has(roomId)) {
                            roomMap.set(roomId, {
                                roomId: roomId,
                                liveName: liveName,
                                liveStatus: liveStatus,
                                liveDuration: liveDuration,
                                launchedTime: launchedTime,
                                cost: 0,
                                gmv: 0,
                                orders: 0
                            });
                        }

                        const room = roomMap.get(roomId)!;
                        // If multiple entries for same room, keep the earliest launched time
                        if (launchedTime && (!room.launchedTime || new Date(launchedTime) < new Date(room.launchedTime))) {
                            room.launchedTime = launchedTime;
                            // Update other fields if they're not set
                            if (!room.liveName && liveName) room.liveName = liveName;
                            if (!room.liveStatus && liveStatus) room.liveStatus = liveStatus;
                            if (!room.liveDuration && liveDuration) room.liveDuration = liveDuration;
                        }
                        room.cost += cost;
                        room.gmv += gmv;
                        room.orders += orders;
                    });

                liveSessions = Array.from(roomMap.values())
                    .map(room => ({
                        roomId: room.roomId,
                        liveName: room.liveName,
                        liveStatus: room.liveStatus,
                        liveDuration: room.liveDuration,
                        launchedTime: room.launchedTime,
                        cost: room.cost,
                        gmv: room.gmv,
                        orders: room.orders,
                        roi: room.cost > 0 ? room.gmv / room.cost : 0
                    }))
                    .sort((a, b) => {
                        // Sort by launched time descending (most recent first)
                        const timeA = a.launchedTime ? new Date(a.launchedTime).getTime() : 0;
                        const timeB = b.launchedTime ? new Date(b.launchedTime).getTime() : 0;
                        return timeB - timeA;
                    });
            }
            
            return {
                campaignId: data.campaignId,
                campaignName: data.campaignName,
                accountName: accountName,
                cost: data.cost,
                gmv: data.gmv,
                orders: data.orders,
                roi: data.cost > 0 ? data.gmv / data.cost : 0,
                liveSessions: liveSessions // Only populated for LIVE_GMV_MAX
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
