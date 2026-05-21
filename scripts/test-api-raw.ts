import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_SHOP = '/order/202309/orders/search';
const VERSION_SHOP = '202309';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

async function testFetch() {
    const shopNumber = 1; // Testing with Shop 1
    const startDateStr = '2025-12-20'; // A known recent date or let's use 2026-05-18
    const endDateStr = '2026-05-19';

    console.log('Fetching credentials...');
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('No credentials found');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    const start = new Date(`${startDateStr}T00:00:00+08:00`);
    const end = new Date(`${endDateStr}T23:59:59+08:00`);
    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);

    const queryParams: any = {
        access_token: accessToken,
        app_key: appKey,
        shop_cipher: shopCipher,
        shop_id: '',
        version: VERSION_SHOP,
        page_size: 5 // Just 5 orders to inspect
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
    const urlForSignature = `${BASE_URL_SHOP}${ENDPOINT_SHOP}?${queryString}`;

    const requestBody = {
        create_time_ge: startTime,
        create_time_lt: endTime
    };

    const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

    const finalQueryParams: any = { ...queryParams };
    finalQueryParams.sign = signatureResult.signature;
    finalQueryParams.timestamp = signatureResult.timestamp;

    const finalSortedKeys = Object.keys(finalQueryParams).sort();
    const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
    const finalUrl = `${BASE_URL_SHOP}${ENDPOINT_SHOP}?${finalQueryString}`;

    console.log('Fetching from API...');
    try {
        const response = await axios.post(finalUrl, requestBody, {
            headers: {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        console.log('API Response Code:', response.data.code);
        if (response.data.code === 0) {
            console.log('Orders (first one):', JSON.stringify(response.data.data.orders?.[0], null, 2));
            console.log('Total orders returned:', response.data.data.orders?.length);
        } else {
            console.log('API Error:', response.data);
        }
    } catch (e: any) {
        console.error('Request failed:', e.message);
    }
}

testFetch();
