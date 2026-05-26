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

async function fetchOrdersForRange(shopCredentials: any, appKey: string, appSecret: string, startDateStr: string, endDateStr: string) {
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
        version: VERSION_ORDERS,
        page_size: 100
    };

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
        if (response.data.code === 0) {
            return response.data.data?.orders || [];
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function run() {
    const shopNumber = 1;
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('No credentials found');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

    console.log('Fetching order history in chunks for the last 90 days to extract all unique SKUs...');
    
    // Split into three 30-day chunks
    const chunks = [
        { start: '2026-04-26', end: '2026-05-26' },
        { start: '2026-03-27', end: '2026-04-25' },
        { start: '2026-02-25', end: '2026-03-26' }
    ];

    try {
        const results = await Promise.all(
            chunks.map(c => fetchOrdersForRange(shopCredentials, appKey, appSecret, c.start, c.end))
        );

        const allOrders = results.flat();
        console.log(`Total orders fetched across last 90 days: ${allOrders.length}`);

        const skuMap: Record<string, { product_name: string; seller_sku: string; sku_id: string; price: string; count: number }> = {};

        allOrders.forEach((order: any) => {
            const lineItems = order.line_items || [];
            lineItems.forEach((item: any) => {
                const skuId = item.sku_id || 'unknown_sku';
                const sellerSku = item.seller_sku || 'none';
                
                if (!skuMap[skuId]) {
                    skuMap[skuId] = {
                        product_name: item.product_name || 'Unknown Product',
                        seller_sku: sellerSku,
                        sku_id: skuId,
                        price: item.sku_sale_price || '0.00',
                        count: 0
                    };
                }
                skuMap[skuId].count += 1;
            });
        });

        const uniqueSKUs = Object.values(skuMap);
        console.log(`\n🎉 Identified a grand total of ${uniqueSKUs.length} unique SKUs in active circulation over the past 90 days:`);
        
        uniqueSKUs.forEach((sku, idx) => {
            console.log(`  ${idx + 1}. "${sku.seller_sku}" - ID: ${sku.sku_id} - ${sku.product_name} (sold ${sku.count} times)`);
        });

    } catch (e: any) {
        console.error('Error during execution:', e.message);
    }
}

run();
