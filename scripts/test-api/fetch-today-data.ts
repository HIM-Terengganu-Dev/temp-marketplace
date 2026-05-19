import { getShopCredentials } from '../../src/lib/tiktok-shop-credentials';
import { query } from '../../src/lib/db';
import axios from 'axios';
import tiktokShop from 'tiktok-shop';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT = '/order/202309/orders/search';
const VERSION = '202309';

// Today's date in GMT+8 (Malaysia time)
const getTodayGMT8Range = () => {
    const now = new Date();
    // Convert to Kuala Lumpur timezone
    const klDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    
    // Start of today: 00:00:00 GMT+8
    const start = new Date(klDate);
    start.setHours(0, 0, 0, 0);
    
    // End of today: 23:59:59.999 GMT+8
    const end = new Date(klDate);
    end.setHours(23, 59, 59, 999);
    
    return {
        startDateStr: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
        startTime: Math.floor(start.getTime() / 1000),
        endTime: Math.floor(end.getTime() / 1000)
    };
};

async function checkTodayGMV(shopNumber: number, name: string) {
    const creds = await getShopCredentials(shopNumber);
    if (!creds) {
        console.log(`Shop #${shopNumber} (${name}): No credentials found!`);
        return 0;
    }

    const { startDateStr, startTime, endTime } = getTodayGMT8Range();
    
    let allOrders: any[] = [];
    let nextPageToken = '';
    let hasMore = true;

    try {
        while (hasMore) {
            const queryParams: any = {
                access_token: creds.access_token,
                app_key: appKey,
                shop_cipher: creds.shop_cipher,
                shop_id: '',
                version: VERSION,
                page_size: 50
            };

            if (nextPageToken) {
                queryParams.page_token = nextPageToken;
            }

            const urlPath = ENDPOINT;
            const baseUrlWithoutSlash = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

            const sortedKeys = Object.keys(queryParams).sort();
            const queryString = sortedKeys
                .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
                .join('&');

            const urlForSignature = `${baseUrlWithoutSlash}${urlPath}?${queryString}`;

            const requestBody = {
                create_time_ge: startTime,
                create_time_lt: endTime
            };

            const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

            const finalQueryParams = { ...queryParams };
            finalQueryParams.sign = signatureResult.signature;
            finalQueryParams.timestamp = signatureResult.timestamp;

            const finalSortedKeys = Object.keys(finalQueryParams).sort();
            const finalQueryString = finalSortedKeys
                .map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`)
                .join('&');

            const finalUrl = `${baseUrlWithoutSlash}${urlPath}?${finalQueryString}`;

            const headers = {
                'x-tts-access-token': creds.access_token,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(finalUrl, requestBody, { headers });

            if (response.data.code !== 0) {
                console.error(`Shop #${shopNumber} API error: ${response.data.message}`);
                break;
            }

            const data = response.data.data;
            const orders = data.orders || [];

            if (orders.length > 0) {
                allOrders = allOrders.concat(orders);
            }

            nextPageToken = data.next_page_token;
            hasMore = !!nextPageToken;
        }

        let totalGMV = 0;
        let validOrdersCount = 0;
        
        allOrders.forEach(order => {
            let orderTotal = 0;
            if (order.line_items) {
                order.line_items.forEach((item: any) => {
                    orderTotal += parseFloat(item.sale_price || 0) + parseFloat(item.platform_discount || 0);
                });
            }
            
            const status = order.status?.toUpperCase();
            if (status !== 'CANCELLED' && status !== 'REFUNDED') {
                totalGMV += orderTotal;
                validOrdersCount++;
            }
        });

        console.log(`Shop #${shopNumber} (${name}) Today: GMV: RM ${totalGMV.toFixed(2)} | Orders: ${validOrdersCount}`);
        return totalGMV;

    } catch (e: any) {
        console.error(`Shop #${shopNumber} error:`, e.message);
        return 0;
    }
}

async function main() {
    const range = getTodayGMT8Range();
    console.log(`Checking data for TODAY (${range.startDateStr}) in GMT+8...`);
    
    await checkTodayGMV(1, 'DrSamhanWellness');
    await checkTodayGMV(2, 'HIM CLINIC');
    await checkTodayGMV(3, 'Vigomax HQ');
    await checkTodayGMV(4, 'VigomaxPlus HQ');
}

main().catch(console.error);
