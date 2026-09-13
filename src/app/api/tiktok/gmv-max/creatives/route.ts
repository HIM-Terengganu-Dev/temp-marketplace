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
        name: 'Him.DrSamhan',
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
    },
    '3': {
        name: 'Vigomax HQ',
        shopId: '7494799386964364219',
        advertiserId: '7259935704698929153',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN',
        hasGMVCampaigns: true
    },
    '4': {
        name: 'VigomaxPlus HQ',
        shopId: '7495580262600706099',
        advertiserId: '7259935704698929153',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN',
        hasGMVCampaigns: true
    }
};

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined): string => {
    if (!val) return '';
    return val.trim().replace(/^["']|["']$/g, '');
};

export interface CreativeItem {
    itemId: string;
    isCatalog: boolean;
    creativeType: 'DYNAMIC_CATALOG' | 'VIDEO_POST';
    videoUrl: string | null;
    cost: number;
    orders: number;
    grossRevenue: number;
    roi: number;
    costPerOrder: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
}

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
        return NextResponse.json({
            shopName: shopConfig.name,
            campaignId,
            dateRange: { start: startDate, end: endDate },
            summary: {
                totalCost: 0,
                totalOrders: 0,
                totalGrossRevenue: 0,
                roi: 0,
                totalImpressions: 0,
                totalClicks: 0,
                creativeCount: 0
            },
            creatives: []
        });
    }

    const accessToken = cleanEnv(process.env[shopConfig.accessTokenEnv]);
    if (!accessToken) {
        return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
    }

    try {
        // Step 1: Discover item_group_ids for this campaign
        const itemGroupParams = new URLSearchParams({
            advertiser_id: shopConfig.advertiserId,
            store_ids: JSON.stringify([shopConfig.shopId]),
            gmv_max_promotion_type: 'PRODUCT_GMV_MAX',
            dimensions: JSON.stringify(['item_group_id']),
            metrics: JSON.stringify(['cost', 'gross_revenue', 'orders']),
            filtering: JSON.stringify({ campaign_ids: [campaignId] }),
            start_date: startDate,
            end_date: endDate,
            page_size: '100'
        });

        const itemGroupUrl = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${itemGroupParams.toString()}`;
        const itemGroupRes = await fetch(itemGroupUrl, {
            method: 'GET',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        const itemGroupData = await itemGroupRes.json();
        if (itemGroupData.code !== 0) {
            console.error('[Product GMV Max Creatives] Item group fetch error:', itemGroupData);
            return NextResponse.json({ error: itemGroupData.message || 'Failed to fetch item groups' }, { status: 500 });
        }

        const itemGroupList = itemGroupData.data?.list || [];
        const itemGroupIds = itemGroupList
            .map((item: any) => item.dimensions?.item_group_id)
            .filter(Boolean);

        if (itemGroupIds.length === 0) {
            return NextResponse.json({
                shopName: shopConfig.name,
                campaignId,
                dateRange: { start: startDate, end: endDate },
                summary: {
                    totalCost: 0,
                    totalOrders: 0,
                    totalGrossRevenue: 0,
                    roi: 0,
                    totalImpressions: 0,
                    totalClicks: 0,
                    creativeCount: 0
                },
                creatives: []
            });
        }

        // Step 2: Fetch creative items for item groups with pagination
        const rawItems: any[] = [];
        let page = 1;
        const maxPages = 5; // Cap at 5,000 items max

        while (page <= maxPages) {
            const itemReportParams = new URLSearchParams({
                advertiser_id: shopConfig.advertiserId,
                store_ids: JSON.stringify([shopConfig.shopId]),
                gmv_max_promotion_type: 'PRODUCT_GMV_MAX',
                dimensions: JSON.stringify(['item_id']),
                metrics: JSON.stringify([
                    'cost',
                    'orders',
                    'gross_revenue',
                    'roi',
                    'cost_per_order',
                    'product_clicks',
                    'product_impressions'
                ]),
                filtering: JSON.stringify({
                    campaign_ids: [campaignId],
                    item_group_ids: itemGroupIds
                }),
                start_date: startDate,
                end_date: endDate,
                page_size: '1000',
                page: page.toString()
            });

            const itemReportUrl = `${BASE_URL}/open_api/${API_VERSION}/gmv_max/report/get/?${itemReportParams.toString()}`;
            const itemReportRes = await fetch(itemReportUrl, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const itemReportData = await itemReportRes.json();
            if (itemReportData.code !== 0) {
                console.error('[Product GMV Max Creatives] Item report error:', itemReportData);
                break;
            }

            const pageList = itemReportData.data?.list || [];
            rawItems.push(...pageList);

            const totalPages = itemReportData.data?.page_info?.total_page || 1;
            if (page >= totalPages) break;
            page++;
        }

        // Step 3: Format & sort creatives
        const creatives: CreativeItem[] = rawItems.map((item: any) => {
            const itemId = item.dimensions?.item_id || '';
            const isCatalog = itemId === '-1';
            const cost = parseFloat(item.metrics?.cost || '0');
            const orders = parseInt(item.metrics?.orders || '0', 10);
            const grossRevenue = parseFloat(item.metrics?.gross_revenue || '0');
            const roi = parseFloat(item.metrics?.roi || '0');
            const costPerOrder = parseFloat(item.metrics?.cost_per_order || '0');
            const impressions = parseInt(item.metrics?.product_impressions || '0', 10);
            const clicks = parseInt(item.metrics?.product_clicks || '0', 10);
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? cost / clicks : 0;

            return {
                itemId,
                isCatalog,
                creativeType: isCatalog ? 'DYNAMIC_CATALOG' : 'VIDEO_POST',
                videoUrl: !isCatalog ? `https://www.tiktok.com/@/video/${itemId}` : null,
                cost,
                orders,
                grossRevenue,
                roi,
                costPerOrder,
                impressions,
                clicks,
                ctr,
                cpc
            };
        });

        // Filter: Keep items with positive spend, orders, or impressions first, sorted by cost descending
        const activeCreatives = creatives
            .filter(c => c.cost > 0 || c.orders > 0 || c.impressions > 0 || c.clicks > 0)
            .sort((a, b) => b.cost - a.cost);

        // Calculate summary
        const totalCost = activeCreatives.reduce((sum, c) => sum + c.cost, 0);
        const totalOrders = activeCreatives.reduce((sum, c) => sum + c.orders, 0);
        const totalGrossRevenue = activeCreatives.reduce((sum, c) => sum + c.grossRevenue, 0);
        const totalImpressions = activeCreatives.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = activeCreatives.reduce((sum, c) => sum + c.clicks, 0);
        const overallRoi = totalCost > 0 ? totalGrossRevenue / totalCost : 0;

        return NextResponse.json({
            shopName: shopConfig.name,
            campaignId,
            dateRange: { start: startDate, end: endDate },
            summary: {
                totalCost,
                totalOrders,
                totalGrossRevenue,
                roi: overallRoi,
                totalImpressions,
                totalClicks,
                creativeCount: activeCreatives.length,
                totalRawItemsChecked: rawItems.length
            },
            creatives: activeCreatives
        });
    } catch (error: any) {
        console.error('[Product GMV Max Creatives] Unhandled error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to fetch creative details' }, { status: 500 });
    }
}
