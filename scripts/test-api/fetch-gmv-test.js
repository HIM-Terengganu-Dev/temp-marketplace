const axios = require('axios');
const tiktokShop = require('tiktok-shop');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const accessToken = cleanEnv(process.env.TIKTOK_SHOP1_ACCESS_TOKEN);
const shopCipher = cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER);
const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

const baseUrl = 'https://open-api.tiktokglobalshop.com';
const endpoint = '/order/202309/orders/search';
const version = '202309';

// Date Range: 25 Dec 2025
const startTime = new Date('2025-12-25T00:00:00+08:00').getTime() / 1000;
const endTime = new Date('2025-12-25T23:59:59+08:00').getTime() / 1000;

console.log(`Calculating GMV for TikTok Shop 1`);
console.log(`Time Range (Epoch): ${startTime} - ${endTime}`);

async function fetchOrders() {
    let allOrders = [];
    let nextPageToken = '';
    let hasMore = true;
    let pageCount = 0;

    try {
        while (hasMore) {
            pageCount++;
            console.log(`Fetching page ${pageCount}...`);

            // Structure based on working cURL:
            // Query Params: access_token, app_key, page_size, shop_cipher, shop_id, sign, timestamp, version
            // Body: create_time_ge, create_time_lt

            const queryParams = {
                access_token: accessToken,
                app_key: appKey,
                shop_cipher: shopCipher,
                shop_id: '', // Using empty string as per original setup/doc, likely fine if using shop_cipher
                version: version,
                page_size: 50 // Moved from body to query params
            };

            if (nextPageToken) {
                queryParams.page_token = nextPageToken; // Assuming page_token also goes in query if page_size is there
            }

            const urlPath = endpoint;
            const baseUrlWithoutSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

            // Build query string for signature (sort by key)
            const sortedKeys = Object.keys(queryParams).sort();
            const queryString = sortedKeys
                .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
                .join('&');

            const urlForSignature = `${baseUrlWithoutSlash}${urlPath}?${queryString}`;

            // Body only contains time filters
            const requestBody = {
                create_time_ge: Math.floor(startTime),
                create_time_lt: Math.floor(endTime)
                // sort fields removed to match minimal working curl, can add back later if needed
            };

            console.log('Timestamps:', Math.floor(startTime), Math.floor(endTime));

            // Generate signature
            // Check if library includes body in signature. 
            // Standard V202309 usually requires body participation.
            const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

            // Add signature and timestamp to final query params
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

            // Debug CURL
            const curlCmd = `curl -k -X POST "${finalUrl}" -H "Content-Type: application/json" -H "x-tts-access-token: ${accessToken}" -d '${JSON.stringify(requestBody)}'`;
            console.log('DEBUG CURL:', curlCmd);

            const response = await axios.post(finalUrl, requestBody, { headers });

            if (response.data.code !== 0) {
                console.log('--- API ERROR RESPONSE ---');
                console.log(JSON.stringify(response.data, null, 2));
                console.log('--------------------------');
                break;
            }

            const data = response.data.data;
            // Handle different variations of "orders" list key if needed, but doc says "orders"
            const orders = data.orders || data.order_list || [];

            if (orders.length > 0) {
                console.log(`Received ${orders.length} orders.`);
                allOrders = allOrders.concat(orders);
            } else {
                console.log('No orders found in this page.');
            }

            nextPageToken = data.next_page_token;
            hasMore = !!nextPageToken;
        }

        console.log(`Total Orders Fetched: ${allOrders.length}`);
        calculateGMV(allOrders);

    } catch (error) {
        console.error('--- EXCEPTION CAUGHT ---');
        const errorData = error.response ? error.response.data : { message: error.message, stack: error.stack };
        console.error('Writing error to error.json');
        fs.writeFileSync(path.resolve(__dirname, 'error.json'), JSON.stringify(errorData, null, 2));
    }
}

function calculateGMV(orders) {
    let totalGMV = 0;

    orders.forEach(order => {
        let orderTotal = 0;
        if (order.line_items) {
            order.line_items.forEach(item => {
                // Use sale_price as requested
                orderTotal += parseFloat(item.sale_price);
            });
        }
        totalGMV += orderTotal;
        if (allOrders.length > 0) {
            fs.writeFileSync(path.resolve(__dirname, 'order_sample.json'), JSON.stringify(allOrders[0], null, 2));
            console.log('Saved first order to order_sample.json');
        }

    });

    console.log(`--------------------------`);
    // Output 0 if no orders, but formatted
    console.log(`Calculated GMV for 25 Dec 2025: RM ${totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`--------------------------`);
}

fetchOrders();
