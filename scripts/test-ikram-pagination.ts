import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_ORDERS = '/order/202309/orders/search';
const VERSION_ORDERS = '202309';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const parseDateGMT8 = (dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
    return new Date(isoString);
};

async function run() {
    const shopNumber = 1;
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('Credentials not found');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    const startDateStr = '2026-05-25';
    const endDateStr = '2026-05-25';

    const start = parseDateGMT8(startDateStr, 0, 0, 0, 0);
    const end = parseDateGMT8(endDateStr, 23, 59, 59, 999);
    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);

    let allOrders: any[] = [];
    let nextPageToken = '';
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
        pageCount++;
        console.log(`\n--- Fetching Page ${pageCount} with page_token: "${nextPageToken}" ---`);

        const queryParams: any = {
            access_token: accessToken,
            app_key: appKey,
            shop_cipher: shopCipher,
            shop_id: '',
            version: VERSION_ORDERS,
            page_size: 50
        };

        if (nextPageToken) {
            queryParams.page_token = nextPageToken;
        }

        const sortedKeys = Object.keys(queryParams).sort();
        const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
        const urlForSignature = `${BASE_URL_SHOP}${ENDPOINT_ORDERS}?${queryString}`;

        const requestBody = {
            create_time_ge: startTime,
            create_time_lt: endTime
        };

        const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

        const finalQueryParams: any = { 
            ...queryParams,
            sign: signatureResult.signature,
            timestamp: signatureResult.timestamp
        };

        const finalSortedKeys = Object.keys(finalQueryParams).sort();
        const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
        const finalUrl = `${BASE_URL_SHOP}${ENDPOINT_ORDERS}?${finalQueryString}`;

        try {
            const response = await axios.post(finalUrl, requestBody, {
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Page ${pageCount} response code: ${response.data.code}`);
            if (response.data.code !== 0) {
                console.error(`Page ${pageCount} API Error:`, response.data);
                break;
            }

            const data = response.data.data;
            const orders = data?.orders || [];
            console.log(`Page ${pageCount} orders count: ${orders.length}`);
            
            if (orders.length > 0) {
                allOrders = allOrders.concat(orders);
            }

            nextPageToken = data?.next_page_token || '';
            hasMore = !!nextPageToken;
            console.log(`Page ${pageCount} next_page_token returned: "${nextPageToken}"`);

        } catch (e: any) {
            console.error(`Page ${pageCount} failed:`, e.message);
            break;
        }
    }

    console.log(`\nPagination finished. Total orders retrieved: ${allOrders.length}`);
    let gmvSum = 0;
    allOrders.forEach(o => {
        o.line_items?.forEach((item: any) => {
            gmvSum += parseFloat(item.sale_price || '0');
        });
    });
    console.log(`Grand calculated GMV sum: RM ${gmvSum.toFixed(2)}`);
}

run();
