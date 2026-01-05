import { NextResponse } from 'next/server';
import axios from 'axios';
import tiktokShop from 'tiktok-shop';

// Configuration for known shops (Best practice: Keep static config separate from logic)
const SHOPS: Record<string, {
    name: string;
    id: string;
    appKey: string | undefined;
    appSecret: string | undefined;
    accessToken: string | undefined;
    shopCipher: string | undefined;
}> = {
    'shop1': {
        name: 'DrSamhanWellness',
        id: '7495609155379170274',
        appKey: process.env.TIKTOK_SHOP_APP_KEY,
        appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
        accessToken: process.env.TIKTOK_SHOP1_ACCESS_TOKEN,
        shopCipher: process.env.TIKTOK_SHOP1_SHOP_CIPHER,
    },
    'shop2': {
        name: 'HIM CLINIC', // Will be fetched from API if available
        id: '7495102143139318172',
        appKey: process.env.TIKTOK_SHOP_APP_KEY,
        appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
        accessToken: process.env.TIKTOK_SHOP2_ACCESS_TOKEN,
        shopCipher: process.env.TIKTOK_SHOP2_SHOP_CIPHER,
    },
    'shop3': {
        name: 'Vigomax HQ', // Will be fetched from API if available
        id: '7494799386964364219',
        appKey: process.env.TIKTOK_SHOP_APP_KEY,
        appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
        accessToken: process.env.TIKTOK_SHOP3_ACCESS_TOKEN,
        shopCipher: process.env.TIKTOK_SHOP3_SHOP_CIPHER,
    },
    'shop4': {
        name: 'VigomaxPlus HQ', // Will be fetched from API if available
        id: '7495580262600706099',
        appKey: process.env.TIKTOK_SHOP_APP_KEY,
        appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
        accessToken: process.env.TIKTOK_SHOP4_ACCESS_TOKEN,
        shopCipher: process.env.TIKTOK_SHOP4_SHOP_CIPHER,
    }
};

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT = '/order/202309/orders/search';
const VERSION = '202309';

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Expecting format: YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // Expecting format: YYYY-MM-DD
    const shopNumber = searchParams.get('shopNumber') || '1'; // Default to shop 1

    // Validate shop number
    const shopKey = `shop${shopNumber}`;
    if (!SHOPS[shopKey]) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumber}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    // Default to today if not provided
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(now.setHours(23, 59, 59, 999));

    // Ensure start date is at 00:00:00
    start.setHours(0, 0, 0, 0);

    // Ensure end date is at 23:59:59
    end.setHours(23, 59, 59, 999);

    // Convert to Unix Timestamp (Seconds)
    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);

    // Get shop configuration
    const shopConfig = SHOPS[shopKey];

    const appKey = cleanEnv(shopConfig.appKey);
    const appSecret = cleanEnv(shopConfig.appSecret);
    const accessToken = cleanEnv(shopConfig.accessToken);
    const shopCipher = cleanEnv(shopConfig.shopCipher);

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        return NextResponse.json({ error: 'Missing Credentials' }, { status: 500 });
    }

    try {
        let allOrders: any[] = [];
        let nextPageToken = '';
        let hasMore = true;
        let totalGMV = 0;

        // Pagination Loop
        while (hasMore) {
            const queryParams: any = {
                access_token: accessToken,
                app_key: appKey,
                shop_cipher: shopCipher,
                shop_id: '',
                version: VERSION,
                page_size: 50
            };

            if (nextPageToken) {
                queryParams.page_token = nextPageToken;
            }

            const urlPath = ENDPOINT;
            const baseUrlWithoutSlash = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

            // Build query string for signature (sort by key)
            const sortedKeys = Object.keys(queryParams).sort();
            const queryString = sortedKeys
                .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
                .join('&');

            const urlForSignature = `${baseUrlWithoutSlash}${urlPath}?${queryString}`;

            const requestBody = {
                create_time_ge: startTime,
                create_time_lt: endTime
            };

            // Generate signature
            // @ts-ignore
            const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

            // Add signature and timestamp to final query params
            const finalQueryParams: any = { ...queryParams };
            finalQueryParams.sign = signatureResult.signature;
            finalQueryParams.timestamp = signatureResult.timestamp;

            const finalSortedKeys = Object.keys(finalQueryParams).sort();
            const finalQueryString = finalSortedKeys
                .map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`)
                .join('&');

            const finalUrl = `${baseUrlWithoutSlash}${urlPath}?${finalQueryString}`;

            const response = await axios.post(finalUrl, requestBody, {
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 0) {
                console.error('TikTok API Error:', response.data);
                throw new Error(response.data.message || 'TikTok API Error');
            }

            const data = response.data.data;
            const orders = data.orders || []; // Assuming 'orders' based on doc/test

            if (orders.length > 0) {
                allOrders = allOrders.concat(orders);
            }

            nextPageToken = data.next_page_token;
            hasMore = !!nextPageToken;
        }

        // Track unique buyer user IDs
        const uniqueBuyerIds = new Set<string>();

        // Calculate GMV - INCLUDING cancelled and refunded orders (Ikram's version)
        allOrders.forEach(order => {
            // Track unique buyer_user_id (fallback to user_id if buyer_user_id doesn't exist)
            const buyerUserId = order.buyer_user_id || order.user_id;
            if (buyerUserId) {
                uniqueBuyerIds.add(buyerUserId);
            }

            let orderTotal = 0;
            if (order.line_items) {
                order.line_items.forEach((item: any) => {
                    orderTotal += parseFloat(item.sale_price || '0');
                });
            }
            totalGMV += orderTotal;
        });

        // Count all orders (including cancelled and refunded)
        const allOrdersCount = allOrders.length;

        return NextResponse.json({
            shopName: shopConfig.name,
            gmv: totalGMV,
            orderCount: allOrdersCount,
            totalOrderCount: allOrdersCount,
            uniqueCustomers: uniqueBuyerIds.size,
            currency: 'RM', // Hardcoded as per implementation context, but could check order.currency
            dateRange: { start, end }
        });

    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

