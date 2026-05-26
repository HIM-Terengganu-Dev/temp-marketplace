import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_PRODUCT = '/product/202309/products/search';
const VERSION_PRODUCT = '202309';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

async function testFetchSKUs() {
    const shopNumber = 1; // Testing with Shop 1
    console.log(`Fetching credentials for Shop ${shopNumber}...`);
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error('No credentials found for Shop 1');
        return;
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        console.error('Missing TikTok Shop appKey, appSecret, accessToken or shopCipher');
        return;
    }

    console.log('Constructing API request parameters...');
    const queryParams: any = {
        access_token: accessToken,
        app_key: appKey,
        shop_cipher: shopCipher,
        shop_id: '',
        version: VERSION_PRODUCT,
        page_size: 20
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
    const urlForSignature = `${BASE_URL_SHOP}${ENDPOINT_PRODUCT}?${queryString}`;

    // Filter by ALL status to fetch all items
    const requestBody = {
        status: 'ALL'
    };

    console.log('Generating signature using tiktok-shop helper...');
    const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

    const finalQueryParams: any = { 
        ...queryParams,
        sign: signatureResult.signature,
        timestamp: signatureResult.timestamp
    };

    const finalSortedKeys = Object.keys(finalQueryParams).sort();
    const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
    const finalUrl = `${BASE_URL_SHOP}${ENDPOINT_PRODUCT}?${finalQueryString}`;

    console.log(`Sending POST request to: ${ENDPOINT_PRODUCT}...`);
    try {
        const response = await axios.post(finalUrl, requestBody, {
            headers: {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n--- RESPONSE RECEIVED ---');
        console.log('Response Status:', response.status);
        console.log('Response Code:', response.data.code);
        console.log('Response Message:', response.data.message);
        
        if (response.data.code === 0) {
            const data = response.data.data || {};
            const products = data.products || [];
            console.log(`\nSuccessfully fetched ${products.length} products!`);
            
            if (products.length > 0) {
                console.log('\nProducts List:');
                products.forEach((p: any, idx: number) => {
                    console.log(`\n[Product ${idx + 1}]`);
                    console.log(`  ID:   ${p.id}`);
                    console.log(`  Name: ${p.name}`);
                    console.log(`  Status: ${p.status}`);
                    
                    if (p.skus && p.skus.length > 0) {
                        console.log(`  SKUs (${p.skus.length}):`);
                        p.skus.forEach((sku: any, sIdx: number) => {
                            console.log(`    - SKU ${sIdx + 1}: ID: ${sku.id}, Seller SKU: "${sku.seller_sku}", Price: ${sku.price?.tax_exclusive_price} ${sku.price?.currency || 'MYR'}`);
                        });
                    } else {
                        console.log('  SKUs: None found');
                    }
                });
            }
        } else {
            console.error('API Error Response:', JSON.stringify(response.data, null, 2));
        }

    } catch (e: any) {
        console.error('API Request failed:', e.message);
        if (e.response) {
            console.error('Error response data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

testFetchSKUs();
