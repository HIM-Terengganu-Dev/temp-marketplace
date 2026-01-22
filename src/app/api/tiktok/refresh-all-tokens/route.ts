import { NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/lib/db';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

// TikTok Shop token refresh endpoint
const TOKEN_BASE_URL = 'https://auth.tiktok-shops.com';
const REFRESH_TOKEN_ENDPOINT = '/api/v2/token/refresh';

interface RefreshTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    refresh_expires_in?: number;
    access_token_expire_in?: number;
    refresh_token_expire_in?: number;
}

interface ShopToken {
    shop_number: number;
    shop_name: string;
    shop_id: string;
    access_token: string;
    refresh_token: string;
    shop_cipher: string;
}

interface RefreshResult {
    shopNumber: number;
    shopName: string;
    success: boolean;
    error?: string;
    newAccessToken?: string;
    newRefreshToken?: string;
}

/**
 * Refresh a single shop's access token
 */
async function refreshShopToken(shop: ShopToken, appKey: string, appSecret: string): Promise<RefreshResult> {
    try {
        const tokenBaseUrl = TOKEN_BASE_URL.endsWith('/') ? TOKEN_BASE_URL.slice(0, -1) : TOKEN_BASE_URL;
        
        const queryParams = new URLSearchParams();
        queryParams.append('app_key', appKey);
        queryParams.append('app_secret', appSecret);
        queryParams.append('grant_type', 'refresh_token');
        queryParams.append('refresh_token', shop.refresh_token);
        
        const url = `${tokenBaseUrl}${REFRESH_TOKEN_ENDPOINT}?${queryParams.toString()}`;

        const response = await axios.get<any>(url);

        // Check for error in response
        if (response.data.error || response.data.error_code || response.data.error_description) {
            return {
                shopNumber: shop.shop_number,
                shopName: shop.shop_name,
                success: false,
                error: response.data.error_description || response.data.error || `Error code: ${response.data.error_code || 'unknown'}`
            };
        }

        const data = response.data.data || response.data;
        
        if (!data || !data.access_token) {
            return {
                shopNumber: shop.shop_number,
                shopName: shop.shop_name,
                success: false,
                error: 'Invalid response format from TikTok Shop API'
            };
        }

        const tokenData: RefreshTokenResponse = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || shop.refresh_token, // Use existing if not provided
            expires_in: data.expires_in || data.access_token_expire_in || 0,
            token_type: data.token_type || 'Bearer',
            refresh_expires_in: data.refresh_expires_in || data.refresh_token_expire_in,
            access_token_expire_in: data.access_token_expire_in,
            refresh_token_expire_in: data.refresh_token_expire_in,
        };

        // Update database with new tokens
        // Handle expiration times - TikTok API may return in seconds (Unix timestamp) or milliseconds
        // If the value is > 10^10, it's likely in milliseconds, otherwise it's in seconds
        const accessTokenExpireIn = tokenData.access_token_expire_in 
            ? (tokenData.access_token_expire_in > 10000000000 
                ? Math.floor(tokenData.access_token_expire_in / 1000) 
                : tokenData.access_token_expire_in)
            : null;
        const refreshTokenExpireIn = tokenData.refresh_token_expire_in
            ? (tokenData.refresh_token_expire_in > 10000000000
                ? Math.floor(tokenData.refresh_token_expire_in / 1000)
                : tokenData.refresh_token_expire_in)
            : null;

        await query(`
            UPDATE credentials.refresh_tiktokshops_token
            SET 
                access_token = $1,
                refresh_token = $2,
                access_token_expire_in = $3,
                refresh_token_expire_in = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE shop_number = $5
        `, [
            tokenData.access_token,
            tokenData.refresh_token,
            accessTokenExpireIn,
            refreshTokenExpireIn,
            shop.shop_number
        ]);

        return {
            shopNumber: shop.shop_number,
            shopName: shop.shop_name,
            success: true,
            newAccessToken: tokenData.access_token,
            newRefreshToken: tokenData.refresh_token
        };
    } catch (error: any) {
        console.error(`Error refreshing token for shop ${shop.shop_number}:`, error.response?.data || error.message);
        
        return {
            shopNumber: shop.shop_number,
            shopName: shop.shop_name,
            success: false,
            error: error.response?.data?.error_description || error.response?.data?.error || error.message || 'Unknown error'
        };
    }
}

/**
 * Refresh all TikTok Shop tokens
 */
export async function POST(request: Request) {
    try {
        const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
        const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);

        if (!appKey || !appSecret) {
            return NextResponse.json(
                { error: 'Missing TIKTOK_SHOP_APP_KEY or TIKTOK_SHOP_APP_SECRET in environment variables' },
                { status: 500 }
            );
        }

        // Fetch all shops from database
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher
            FROM credentials.refresh_tiktokshops_token
            ORDER BY shop_number
        `);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'No shops found in database. Please run the populate script first.' },
                { status: 404 }
            );
        }

        const shops: ShopToken[] = result.rows;
        const results: RefreshResult[] = [];

        // Refresh tokens for all shops in parallel
        const refreshPromises = shops.map(shop => refreshShopToken(shop, appKey, appSecret));
        const refreshResults = await Promise.all(refreshPromises);

        results.push(...refreshResults);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            summary: {
                total: results.length,
                successful: successCount,
                failed: failCount
            },
            results: results.map(r => ({
                shopNumber: r.shopNumber,
                shopName: r.shopName,
                success: r.success,
                error: r.error || undefined
            }))
        });
    } catch (error: any) {
        console.error('Error in refresh all tokens endpoint:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

