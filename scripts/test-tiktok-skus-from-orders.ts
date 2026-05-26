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

async function fetchSKUsFromOrders() {
    const shopNumber = 1; // Shop 1: Him.DrSamhan
    console.log(`Fetching credentials for Shop ${shopNumber}...`);
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('No credentials found');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    // Use a wider date range to ensure we capture actual orders with different SKUs
    const startDateStr = '2026-05-01';
    const endDateStr = '2026-05-26';
    console.log(`Querying order list from ${startDateStr} to ${endDateStr} to extract SKUs...`);

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
        page_size: 50
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
        console.log('Sending request to TikTok Orders API...');
        const response = await axios.post(finalUrl, requestBody, {
            headers: {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) {
            console.error('API Error:', response.data);
            return;
        }

        const orders = response.data.data?.orders || [];
        console.log(`\nSuccessfully fetched ${orders.length} orders.`);

        // Aggregate unique SKUs/products
        const skuMap: Record<string, { product_name: string; seller_sku: string; sku_id: string; price: string; currency: string; count: number }> = {};

        orders.forEach((order: any) => {
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
                        currency: order.currency || 'MYR',
                        count: 0
                    };
                }
                skuMap[skuId].count += 1;
            });
        });

        const uniqueSKUs = Object.values(skuMap);
        console.log(`\n🎉 Extracted ${uniqueSKUs.length} unique SKUs from order history:`);
        
        console.log('\n============================================================');
        console.log('                    TIKTOK SHOP SKU LIST                    ');
        console.log('============================================================');
        uniqueSKUs.forEach((sku, idx) => {
            console.log(`\n[SKU ${idx + 1}]`);
            console.log(`  Product Name:  ${sku.product_name}`);
            console.log(`  Seller SKU:    "${sku.seller_sku}"`);
            console.log(`  SKU ID:        ${sku.sku_id}`);
            console.log(`  Sample Price:  ${sku.price} ${sku.currency}`);
            console.log(`  Order Volume:  Ordered ${sku.count} times in last 30 days`);
        });
        console.log('============================================================\n');

    } catch (e: any) {
        console.error('Request failed:', e.message);
    }
}

fetchSKUsFromOrders();
