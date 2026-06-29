import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT = '/analytics/202405/shop/performance';
const VERSION = '202405';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

async function testFetch() {
    const shopNumber = 1;
    // Query last 7 days to ensure we get data
    const today = new Date();
    const startDateStr = '2026-06-15';
    const endDateStr = '2026-06-16';

    console.log(`Fetching credentials for shop ${shopNumber}...`);
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('No credentials found');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    const queryParams: any = {
        access_token: accessToken,
        app_key: appKey,
        shop_cipher: shopCipher,
        version: VERSION,
        start_date_ge: startDateStr,
        end_date_lt: endDateStr
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
    const urlForSignature = `${BASE_URL}${ENDPOINT}?${queryString}`;

    const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, {});

    const finalQueryParams: any = { ...queryParams };
    finalQueryParams.sign = signatureResult.signature;
    finalQueryParams.timestamp = signatureResult.timestamp;

    const finalSortedKeys = Object.keys(finalQueryParams).sort();
    const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
    const finalUrl = `${BASE_URL}${ENDPOINT}?${finalQueryString}`;

    console.log(`Fetching Analytics from API from ${startDateStr} to ${endDateStr}...`);
    try {
        const response = await axios.get(finalUrl, {
            headers: {
                'x-tts-access-token': accessToken
            }
        });

        console.log('API Response Code:', response.data.code);
        if (response.data.code === 0) {
            console.log('Analytics Response:', JSON.stringify(response.data.data, null, 2));
        } else {
            console.log('API Error:', response.data);
        }
    } catch (e: any) {
        console.error('Request failed:', e.message);
    }
}

testFetch();
