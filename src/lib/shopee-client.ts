import crypto from 'crypto';
import axios from 'axios';
import { query } from './db';

const PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const API_BASE_URL = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeesz.com';

/**
 * Generates the HMAC-SHA256 signature required by Shopee Open API v2.
 */
export function generateShopeeSignature(
    path: string,
    timestamp: number,
    accessToken?: string,
    shopId?: number
): string {
    let baseString = `${PARTNER_ID}${path}${timestamp}`;
    if (accessToken) {
        baseString += accessToken;
    }
    if (shopId) {
        baseString += shopId;
    }
    return crypto
        .createHmac('sha256', PARTNER_KEY)
        .update(baseString)
        .digest('hex');
}

/**
 * Interface representing Shopee token data returned by APIs.
 */
export interface ShopeeTokenResponse {
    access_token: string;
    refresh_token: string;
    expire_in: number; // in seconds
    refresh_token_expire_in: number; // in seconds
    shop_id: number;
    error?: string;
    message?: string;
}

/**
 * Exchanges the temporary authorization code for access and refresh tokens.
 */
export async function exchangeShopeeCodeForTokens(
    code: string,
    shopId: number
): Promise<ShopeeTokenResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/token/get';
    const sign = generateShopeeSignature(path, timestamp);

    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

    console.log(`Exchanging Shopee code for shop ${shopId}...`);
    const response = await axios.post(url, {
        code,
        partner_id: PARTNER_ID,
        shop_id: shopId
    }, {
        headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    if (data.error) {
        throw new Error(`Shopee token exchange error: ${data.message || data.error}`);
    }

    return data as ShopeeTokenResponse;
}

/**
 * Refreshes an expired access token using the refresh token.
 */
export async function refreshShopeeAccessToken(
    refreshToken: string,
    shopId: number
): Promise<ShopeeTokenResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/access_token/get';
    const sign = generateShopeeSignature(path, timestamp);

    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

    console.log(`Refreshing access token for Shopee shop ${shopId}...`);
    const response = await axios.post(url, {
        refresh_token: refreshToken,
        partner_id: PARTNER_ID,
        shop_id: shopId
    }, {
        headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    if (data.error) {
        throw new Error(`Shopee token refresh error: ${data.message || data.error}`);
    }

    return data as ShopeeTokenResponse;
}

/**
 * Saves or updates tokens for a Shopee shop in the Neon database.
 */
export async function saveShopeeTokens(
    shopId: number,
    shopName: string,
    accessToken: string,
    refreshToken: string,
    expireInSeconds: number,
    refreshExpireInSeconds: number
) {
    const accessTokenExpiresAt = new Date(Date.now() + expireInSeconds * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + refreshExpireInSeconds * 1000);

    const sql = `
        INSERT INTO credentials.refresh_shopeeshops_token 
        (shop_id, shop_name, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (shop_id) 
        DO UPDATE SET 
            shop_name = EXCLUDED.shop_name,
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            access_token_expires_at = EXCLUDED.access_token_expires_at,
            refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;

    const res = await query(sql, [
        shopId,
        shopName || `Shopee Shop ${shopId}`,
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt
    ]);

    return res.rows[0];
}

/**
 * Fetches the database tokens for a shop, automatically refreshing the access token if expired.
 */
export async function getValidShopeeToken(shopId: number): Promise<string> {
    const res = await query(
        'SELECT * FROM credentials.refresh_shopeeshops_token WHERE shop_id = $1',
        [shopId]
    );

    const shop = res.rows[0];
    if (!shop) {
        throw new Error(`Shopee shop ${shopId} is not connected or authorized in this database.`);
    }

    const now = new Date();
    const expiresAt = new Date(shop.access_token_expires_at);

    // If token is expired or will expire in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log(`Access token for Shopee shop ${shopId} is expired or close to expiry. Refreshing...`);
        try {
            const tokens = await refreshShopeeAccessToken(shop.refresh_token, shopId);
            
            // Save updated tokens
            const updated = await saveShopeeTokens(
                shopId,
                shop.shop_name,
                tokens.access_token,
                tokens.refresh_token,
                tokens.expire_in,
                tokens.refresh_token_expire_in
            );
            
            return updated.access_token;
        } catch (error) {
            console.error(`Failed to refresh Shopee token for shop ${shopId}:`, error);
            throw error;
        }
    }

    return shop.access_token;
}

/**
 * Fetches all connected Shopee shops.
 */
export async function getConnectedShopeeShops() {
    const res = await query(
        'SELECT id, shop_id, shop_name, access_token_expires_at, updated_at FROM credentials.refresh_shopeeshops_token ORDER BY shop_name ASC'
    );
    return res.rows;
}

/**
 * Fetches shop info (like shop_name) from Shopee.
 */
export async function getShopeeShopInfo(shopId: number, accessToken: string): Promise<{ shop_name: string }> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/get_shop_info';
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);

    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;

    console.log(`Fetching Shopee shop info for shop ${shopId}...`);
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.error) {
        throw new Error(`Shopee shop info error: ${data.message || data.error}`);
    }

    return { 
        shop_name: data.shop_name || `Shopee Shop ${shopId}` 
    };
}

