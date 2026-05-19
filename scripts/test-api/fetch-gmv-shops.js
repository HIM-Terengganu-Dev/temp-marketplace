const axios = require('axios');
const tiktokShop = require('tiktok-shop');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT = '/order/202309/orders/search';
const VERSION = '202309';

// Date range: Last 7 days to today
const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - 7);

const startTime = Math.floor(startDate.getTime() / 1000);
const endTime = Math.floor(endDate.getTime() / 1000);

async function testShop(shopNumber, name, accessToken, shopCipher) {
    console.log(`\n==================================================`);
    console.log(`Testing GMV for Shop ${shopNumber} (${name})`);
    console.log(`==================================================`);
    
    if (!accessToken || !shopCipher) {
        console.error(`❌ Missing credentials for Shop ${shopNumber}`);
        return;
    }

    let allOrders = [];
    let nextPageToken = '';
    let hasMore = true;
    let pageCount = 0;

    try {
        while (hasMore) {
            pageCount++;
            
            const queryParams = {
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
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(finalUrl, requestBody, { headers });

            if (response.data.code !== 0) {
                console.error(`❌ API Error (Code: ${response.data.code}): ${response.data.message}`);
                break;
            }

            const data = response.data.data;
            const orders = data.orders || [];

            if (orders.length > 0) {
                console.log(`✓ Fetched ${orders.length} orders on page ${pageCount}`);
                allOrders = allOrders.concat(orders);
            } else {
                console.log('✓ No orders found in this page range.');
            }

            nextPageToken = data.next_page_token;
            hasMore = !!nextPageToken;
        }

        // Calculate GMV (excluding cancelled/refunded)
        let totalGMV = 0;
        let validOrdersCount = 0;
        
        allOrders.forEach(order => {
            let orderTotal = 0;
            if (order.line_items) {
                order.line_items.forEach(item => {
                    orderTotal += parseFloat(item.sale_price || 0) + parseFloat(item.platform_discount || 0);
                });
            }
            
            const status = order.status?.toUpperCase();
            if (status !== 'CANCELLED' && status !== 'REFUNDED') {
                totalGMV += orderTotal;
                validOrdersCount++;
            }
        });

        console.log(`✅ Success! Total Orders: ${allOrders.length} | Valid Orders: ${validOrdersCount} | GMV: RM ${totalGMV.toFixed(2)}`);
    } catch (error) {
        console.error(`❌ Exception:`, error.message);
        if (error.response) {
            console.error(`Response details:`, error.response.data);
        }
    }
}

async function main() {
    console.log(`Checking date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    await testShop(1, 'DrSamhanWellness', cleanEnv(process.env.TIKTOK_SHOP1_ACCESS_TOKEN), cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER));
    await testShop(2, 'HIM CLINIC', cleanEnv(process.env.TIKTOK_SHOP2_ACCESS_TOKEN), cleanEnv(process.env.TIKTOK_SHOP2_SHOP_CIPHER));
    await testShop(3, 'Vigomax HQ', cleanEnv(process.env.TIKTOK_SHOP3_ACCESS_TOKEN), cleanEnv(process.env.TIKTOK_SHOP3_SHOP_CIPHER));
    await testShop(4, 'VigomaxPlus HQ', cleanEnv(process.env.TIKTOK_SHOP4_ACCESS_TOKEN), cleanEnv(process.env.TIKTOK_SHOP4_SHOP_CIPHER));
}

main().catch(console.error);
