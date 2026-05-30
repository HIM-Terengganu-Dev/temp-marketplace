import { getValidShopeeToken } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeesz.com';
const PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';

import { generateShopeeSignature } from '../src/lib/shopee-client';

async function callGetApi(shopId: number, accessToken: string, path: string, params: any) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);
    
    const queryParams = new URLSearchParams({
        partner_id: PARTNER_ID.toString(),
        timestamp: timestamp.toString(),
        sign: sign,
        access_token: accessToken,
        shop_id: shopId.toString(),
        ...params
    });
    
    const url = `${API_BASE_URL}${path}?${queryParams.toString()}`;
    const response = await axios.get(url);
    return response.data;
}

async function main() {
    const shopId = 1298030530; // him.drsamhan
    try {
        const accessToken = await getValidShopeeToken(shopId);
        console.log(`Obtained valid token for shop ${shopId}.`);

        console.log("Fetching GMS campaign performance...");
        const res = await callGetApi(shopId, accessToken, '/api/v2/ads/get_gms_campaign_performance', {
            start_date: "29-05-2026",
            end_date: "29-05-2026"
        });

        console.log("Response:", JSON.stringify(res, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

main();
