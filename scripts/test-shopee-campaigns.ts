import { getValidShopeeToken } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeemobile.com';
const PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';

import { generateShopeeSignature } from '../src/lib/shopee-client';

async function testGetEndpoint(shopId: number, accessToken: string, path: string, params: any) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);
    
    // Construct query parameters
    const queryParams = new URLSearchParams({
        partner_id: PARTNER_ID.toString(),
        timestamp: timestamp.toString(),
        sign: sign,
        access_token: accessToken,
        shop_id: shopId.toString(),
        ...params
    });
    
    const url = `${API_BASE_URL}${path}?${queryParams.toString()}`;
    
    try {
        console.log(`\nTesting GET endpoint: ${path}`);
        const response = await axios.get(url);
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(response.data).substring(0, 1000));
    } catch (e: any) {
        console.log(`Failed GET endpoint: ${path}`);
        if (e.response) {
            console.log(`Status: ${e.response.status}`);
            console.log(`Error Response:`, JSON.stringify(e.response.data));
        } else {
            console.log(`Error:`, e.message);
        }
    }
}

async function main() {
    const shopId = 1298030530; // him.drsamhan
    try {
        const accessToken = await getValidShopeeToken(shopId);

        // 1. Test Shop Search ads list endpoint
        await testGetEndpoint(shopId, accessToken, '/api/v2/ads/get_shop_level_campaign_id_list', {
            page_no: 1,
            page_size: 20
        });

        // 2. Test get_shop_campaign_daily_performance
        await testGetEndpoint(shopId, accessToken, '/api/v2/ads/get_shop_campaign_daily_performance', {
            start_date: "29-05-2026",
            end_date: "29-05-2026",
            campaign_id_list: "123" // test dummy
        });

        // 3. Test get_gms_campaign_performance or get_gms_item_performance
        await testGetEndpoint(shopId, accessToken, '/api/v2/ads/get_gms_campaign_performance', {
            start_date: "29-05-2026",
            end_date: "29-05-2026"
        });

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

main();
