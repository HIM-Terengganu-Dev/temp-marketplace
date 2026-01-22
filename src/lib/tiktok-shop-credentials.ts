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
 * Get shop credentials from database
 * Falls back to environment variables if database lookup fails
 */
export async function getShopCredentials(shopNumber: number): Promise<ShopCredentials | null> {
    try {
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher
            FROM credentials.refresh_tiktokshops_token
            WHERE shop_number = $1
        `, [shopNumber]);

        if (result.rows.length > 0) {
            return result.rows[0] as ShopCredentials;
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
        1: { id: '7495609155379170274', name: 'DrSamhanWellness' },
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

