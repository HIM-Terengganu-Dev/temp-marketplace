import { NextResponse } from 'next/server';
import axios from 'axios';
import tiktokShop from 'tiktok-shop';
import { getShopCredentials } from '@/lib/tiktok-shop-credentials';

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT = '/order/202309/orders/search';
const VERSION = '202309';

// Helper to sanitize environment variables
const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Expecting format: YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // Expecting format: YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1'; // Default to shop 1
    const shopNumber = parseInt(shopNumberParam, 10);

    // Validate shop number
    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    // Helper function to convert YYYY-MM-DD to GMT+8 date
    // Creates a Date object representing the specified date/time in GMT+8
    const parseDateGMT8 = (dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date => {
        // Parse the date string (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Create an ISO string representing the time in GMT+8
        // Format: YYYY-MM-DDTHH:mm:ss.sss+08:00
        const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
        
        // Parse as GMT+8 and convert to Date object
        // The Date object will store it as UTC internally
        return new Date(isoString);
    };

    // Default to today in GMT+8 if not provided
    let start: Date;
    let end: Date;
    
    if (startDate && endDate) {
        // Parse dates in GMT+8 timezone
        // Start: 00:00:00 GMT+8
        start = parseDateGMT8(startDate, 0, 0, 0, 0);
        // End: 23:59:59.999 GMT+8
        end = parseDateGMT8(endDate, 23, 59, 59, 999);
    } else {
        // Default to today in GMT+8
        const now = new Date();
        const todayGMT8 = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        const year = todayGMT8.getFullYear();
        const month = String(todayGMT8.getMonth() + 1).padStart(2, '0');
        const day = String(todayGMT8.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        start = parseDateGMT8(todayStr, 0, 0, 0, 0);
        end = parseDateGMT8(todayStr, 23, 59, 59, 999);
    }

    // Convert to Unix Timestamp (Seconds)
    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);
    
    // Debug logging to verify GMT+8 conversion
    console.log(`Date Range GMT+8:`);
    console.log(`  Start: ${startDate} 00:00:00 GMT+8 = ${start.toISOString()} UTC (timestamp: ${startTime})`);
    console.log(`  End: ${endDate} 23:59:59 GMT+8 = ${end.toISOString()} UTC (timestamp: ${endTime})`);

    // Get shop credentials from database
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        return NextResponse.json({ error: `Failed to get credentials for shop ${shopNumber}` }, { status: 500 });
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

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

        // Prepare granular order details for debugging
        const orderDetails: any[] = [];

        // Calculate GMV - exclude cancelled and refunded orders
        allOrders.forEach(order => {
            // Calculate order total
            let orderTotal = 0;
            if (order.line_items) {
                order.line_items.forEach((item: any) => {
                    // GMV = sku subtotal after discount + sku platform discount
                    orderTotal += parseFloat(item.sale_price || '0') + parseFloat(item.platform_discount || '0');
                });
            }

            // Track unique buyer_user_id (fallback to user_id if buyer_user_id doesn't exist)
            const buyerUserId = order.buyer_user_id || order.user_id;
            if (buyerUserId) {
                uniqueBuyerIds.add(buyerUserId);
            }

            // Add order details for granular table (include all orders for debugging)
            orderDetails.push({
                id: order.id,
                status: order.status,
                createTime: order.create_time,
                gmv: orderTotal,
                itemCount: order.line_items?.length || 0,
                buyerUserId: buyerUserId || null,
                isIncluded: true // Will be updated below
            });

            // Skip cancelled and refunded orders for GMV calculation
            const orderStatus = order.status?.toUpperCase();
            if (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED') {
                // Mark as excluded from GMV
                const lastOrder = orderDetails[orderDetails.length - 1];
                if (lastOrder) {
                    lastOrder.isIncluded = false;
                }
                return;
            }

            totalGMV += orderTotal;
        });

        // Count valid orders (excluding cancelled and refunded)
        const validOrders = allOrders.filter(order => {
            const orderStatus = order.status?.toUpperCase();
            return orderStatus !== 'CANCELLED' && orderStatus !== 'REFUNDED';
        });

        return NextResponse.json({
            shopName: shopCredentials.shop_name,
            gmv: totalGMV,
            orderCount: validOrders.length,
            totalOrderCount: allOrders.length, // Include total for reference
            uniqueCustomers: uniqueBuyerIds.size,
            currency: 'RM', // Hardcoded as per implementation context, but could check order.currency
            dateRange: { start, end },
            orders: orderDetails // Granular order details for debugging
        });

    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
