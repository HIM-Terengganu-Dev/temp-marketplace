const axios = require('axios');
const tiktokShop = require('tiktok-shop');
const path = require('path');
const { query } = require('../../src/lib/db');
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
    console.log(`Using Database Token: ${accessToken.substring(0, 15)}...`);
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
    console.log(`Querying database for all credentials...`);
    const result = await query(`
        SELECT shop_number, shop_name, access_token, shop_cipher
        FROM credentials.refresh_tiktokshops_token
        WHERE shop_number IN (3, 4)
        ORDER BY shop_number
    `);
    
    console.log(`Found ${result.rows.length} shops in DB. Testing each...`);
    
    for (const row of result.rows) {
        await testShop(row.shop_number, row.shop_name, row.access_token, row.shop_cipher);
    }
}

main().catch(console.error);
