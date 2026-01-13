import { NextResponse } from 'next/server';

const BASE_URL = 'https://business-api.tiktok.com';
const API_VERSION = 'v1.3';

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

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined): string => {
    if (!val) return '';
    return val.trim().replace(/^["']|["']$/g, '');
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const campaignId = searchParams.get('campaignId');
    const shopNumber = searchParams.get('shopNumber') || '1';

    if (!startDate || !endDate || !campaignId) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate, campaignId' }, { status: 400 });
    }

    const shopConfig = SHOPS[shopNumber];
    if (!shopConfig) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumber}` }, { status: 400 });
    }

    if (!shopConfig.hasGMVCampaigns) {
        return NextResponse.json({ error: 'Shop does not have GMV campaigns' }, { status: 400 });
    }

    const accessToken = cleanEnv(process.env[shopConfig.accessTokenEnv]);
    if (!accessToken) {
        return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
    }

    try {
        // Fetch room data for a specific campaign using filtering
        // Use room_id and stat_time_day dimensions as per TikTok API documentation
        const filtering = {
            campaign_ids: [campaignId]
        };

        const roomParams = new URLSearchParams({
            advertiser_id: shopConfig.advertiserId,
            store_ids: JSON.stringify([shopConfig.shopId]),
            gmv_max_promotion_type: 'LIVE_GMV_MAX',
            dimensions: JSON.stringify(['room_id', 'stat_time_day']),
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
        
        const roomResponse = await fetch(roomUrl, {
            method: 'GET',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const roomResult = await roomResponse.json();
        
        if (roomResult.code !== 0) {
            console.error('Error fetching room data:', roomResult);
            return NextResponse.json({ error: roomResult.message || 'Failed to fetch room data' }, { status: 500 });
        }

        const roomList = roomResult.data?.list || [];
        
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

        roomList.forEach((item: any) => {
            const roomId = item.dimensions.room_id;
            const launchedTime = item.metrics.live_launched_time || item.dimensions.stat_time_day;
            const cost = parseFloat(item.metrics.cost || '0');
            const gmv = parseFloat(item.metrics.gross_revenue || '0');
            const orders = parseInt(item.metrics.orders || '0', 10);
            const liveName = item.metrics.live_name || `Room ${roomId}`;
            const liveStatus = item.metrics.live_status || 'N/A';
            const liveDuration = item.metrics.live_duration || 'N/A';

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
                if (!room.liveName || room.liveName === `Room ${roomId}`) room.liveName = liveName;
                if (!room.liveStatus || room.liveStatus === 'N/A') room.liveStatus = liveStatus;
                if (!room.liveDuration || room.liveDuration === 'N/A') room.liveDuration = liveDuration;
            }
            room.cost += cost;
            room.gmv += gmv;
            room.orders += orders;
        });

        const liveSessions = Array.from(roomMap.values())
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

        return NextResponse.json({
            campaignId: campaignId,
            liveSessions: liveSessions
        });

    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

