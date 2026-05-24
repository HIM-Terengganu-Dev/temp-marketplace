import * as dotenv from 'dotenv';
import axios from 'axios';
import { query, pool } from '../src/lib/db';

dotenv.config();

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const TOKEN_BASE_URL = 'https://auth.tiktok-shops.com';
const REFRESH_TOKEN_ENDPOINT = '/api/v2/token/refresh';

async function refreshAll() {
    console.log(`\n=============================================================`);
    console.log(`🔄 REFRESHING TIKTOK SHOP ACCESS TOKENS`);
    console.log(`=============================================================\n`);

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

    if (!appKey || !appSecret) {
        console.error('❌ Error: Missing TIKTOK_SHOP_APP_KEY or TIKTOK_SHOP_APP_SECRET in environment.');
        process.exit(1);
    }

    try {
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher
            FROM credentials.refresh_tiktokshops_token
            ORDER BY shop_number
        `);

        if (result.rows.length === 0) {
            console.log('No shops found in credentials store.');
            process.exit(0);
        }

        for (const shop of result.rows) {
            console.log(`Refreshing Shop ${shop.shop_number}: ${shop.shop_name}...`);
            
            try {
                const queryParams = new URLSearchParams();
                queryParams.append('app_key', appKey);
                queryParams.append('app_secret', appSecret);
                queryParams.append('grant_type', 'refresh_token');
                queryParams.append('refresh_token', shop.refresh_token);
                
                const url = `${TOKEN_BASE_URL}${REFRESH_TOKEN_ENDPOINT}?${queryParams.toString()}`;
                
                const response = await axios.get(url);
                const body = response.data;

                if (body.error || body.error_code || body.error_description) {
                    console.log(`  ❌ Failed to refresh: ${body.error_description || body.error}`);
                    continue;
                }

                const data = body.data || body;
                if (!data || !data.access_token) {
                    console.log(`  ❌ Failed: Invalid response format`);
                    continue;
                }

                const newAccessToken = data.access_token;
                const newRefreshToken = data.refresh_token || shop.refresh_token;
                const expires = data.expires_in || data.access_token_expire_in || 0;

                await query(`
                    UPDATE credentials.refresh_tiktokshops_token
                    SET 
                        access_token = $1,
                        refresh_token = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE shop_number = $3
                `, [newAccessToken, newRefreshToken, shop.shop_number]);

                console.log(`  ✅ Success! New access token starts with: ${newAccessToken.substring(0, 15)}...`);
            } catch (err: any) {
                console.error(`  ❌ Error during API call for Shop ${shop.shop_number}:`, err.message);
            }
        }

        console.log(`\n=============================================================`);
        console.log(`🎉 Refresh completed!`);
        console.log(`=============================================================\n`);

    } catch (e: any) {
        console.error('Fatal refresh error:', e.message);
    } finally {
        await pool.end();
    }
    process.exit(0);
}

refreshAll();
