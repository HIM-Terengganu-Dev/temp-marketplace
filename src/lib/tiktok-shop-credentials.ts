import axios from 'axios';
import { query } from './db';

export interface ShopCredentials {
    shop_number: number;
    shop_name: string;
    shop_id: string;
    access_token: string;
    refresh_token: string;
    shop_cipher: string;
}

/**
 * Get shop credentials from database.
 * If the access token is expired or close to expiry (within 1 hour),
 * it automatically refreshes the token using the refresh token and updates the DB.
 * Falls back to environment variables if database lookup fails.
 */
export async function getShopCredentials(shopNumber: number): Promise<ShopCredentials | null> {
    try {
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher, access_token_expire_in, updated_at
            FROM credentials.refresh_tiktokshops_token
            WHERE shop_number = $1
        `, [shopNumber]);

        if (result.rows.length > 0) {
            const shop = result.rows[0];
            
            // Check if token is expired or close to expiry (within 1 hour)
            const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';
            const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
            const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
            
            let needsRefresh = false;
            if (shop.updated_at && appKey && appSecret) {
                const updatedAt = new Date(shop.updated_at);
                const expireInSec = shop.access_token_expire_in ? Number(shop.access_token_expire_in) : 86400; // default 24h
                const expiryTime = updatedAt.getTime() + (expireInSec * 1000);
                const now = Date.now();
                
                // If current time is past expiryTime - 1 hour, or past expiryTime
                if (now >= (expiryTime - 1 * 60 * 60 * 1000)) {
                    needsRefresh = true;
                }
            } else if (!shop.access_token) {
                needsRefresh = true;
            }
            
            if (needsRefresh && appKey && appSecret) {
                console.log(`[Token Auto-Refresh] Access token for TikTok Shop ${shopNumber} is expired or close to expiry. Auto-refreshing...`);
                try {
                    const url = `https://auth.tiktok-shops.com/api/v2/token/refresh?app_key=${appKey}&app_secret=${appSecret}&grant_type=refresh_token&refresh_token=${encodeURIComponent(shop.refresh_token)}`;
                    const response = await axios.get(url);
                    const body = response.data;
                    
                    if (body.error || body.error_code || body.error_description) {
                        console.error(`[Token Auto-Refresh] Failed to refresh token for Shop ${shopNumber}:`, body.error_description || body.error);
                    } else {
                        const data = body.data || body;
                        if (data && data.access_token) {
                            const newAccessToken = data.access_token;
                            const newRefreshToken = data.refresh_token || shop.refresh_token;
                            const newExpireIn = data.expires_in || data.access_token_expire_in || 86400;
                            
                            // Parse/clean expire times
                            const accessTokenExpireIn = data.access_token_expire_in 
                                ? (data.access_token_expire_in > 10000000000 
                                    ? Math.floor(data.access_token_expire_in / 1000) 
                                    : data.access_token_expire_in)
                                : Math.floor(newExpireIn);
                                
                            const refreshTokenExpireIn = data.refresh_token_expire_in
                                ? (data.refresh_token_expire_in > 10000000000
                                    ? Math.floor(data.refresh_token_expire_in / 1000)
                                    : data.refresh_token_expire_in)
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
                            `, [newAccessToken, newRefreshToken, accessTokenExpireIn, refreshTokenExpireIn, shopNumber]);
                            
                            console.log(`[Token Auto-Refresh] Shop ${shopNumber} token auto-refreshed successfully!`);
                            
                            // Return the fresh credentials
                            return {
                                shop_number: shopNumber,
                                shop_name: shop.shop_name,
                                shop_id: shop.shop_id,
                                access_token: newAccessToken,
                                refresh_token: newRefreshToken,
                                shop_cipher: shop.shop_cipher
                            };
                        }
                    }
                } catch (refreshErr: any) {
                    console.error(`[Token Auto-Refresh] Critical error during auto-refresh for Shop ${shopNumber}:`, refreshErr.message);
                }
            }

            return {
                shop_number: shopNumber,
                shop_name: shop.shop_name,
                shop_id: shop.shop_id,
                access_token: shop.access_token,
                refresh_token: shop.refresh_token,
                shop_cipher: shop.shop_cipher,
            };
        }
    } catch (error) {
        console.error(`Error fetching shop ${shopNumber} credentials from database:`, error);
    }

    // Fallback to environment variables
    const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';
    
    const accessTokenEnv = `TIKTOK_SHOP${shopNumber}_ACCESS_TOKEN`;
    const refreshTokenEnv = `TIKTOK_SHOP${shopNumber}_REFRESH_TOKEN`;
    const shopCipherEnv = `TIKTOK_SHOP${shopNumber}_SHOP_CIPHER`;

    const accessToken = cleanEnv(process.env[accessTokenEnv]);
    const refreshToken = cleanEnv(process.env[refreshTokenEnv]);
    const shopCipher = cleanEnv(process.env[shopCipherEnv]);

    if (!accessToken || !refreshToken || !shopCipher) {
        return null;
    }

    // Get shop ID from static config (fallback)
    const shopIds: Record<number, { id: string; name: string }> = {
        1: { id: '7495609155379170274', name: 'Him.DrSamhan' },
        2: { id: '7495102143139318172', name: 'HIM CLINIC' },
        3: { id: '7494799386964364219', name: 'Vigomax HQ' },
        4: { id: '7495580262600706099', name: 'VigomaxPlus HQ' },
    };

    const shopInfo = shopIds[shopNumber];
    if (!shopInfo) {
        return null;
    }

    return {
        shop_number: shopNumber,
        shop_name: shopInfo.name,
        shop_id: shopInfo.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        shop_cipher: shopCipher,
    };
}

/**
 * Get all shop credentials from database
 */
export async function getAllShopCredentials(): Promise<ShopCredentials[]> {
    try {
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher
            FROM credentials.refresh_tiktokshops_token
            ORDER BY shop_number
        `);

        return result.rows as ShopCredentials[];
    } catch (error) {
        console.error('Error fetching all shop credentials from database:', error);
        return [];
    }
}
