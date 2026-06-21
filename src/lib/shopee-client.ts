import crypto from 'crypto';
import axios from 'axios';
import { query } from './db';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

const PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const API_BASE_URL = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeemobile.com';

/**
 * Helper to execute a Shopee GET API call with retries and exponential backoff on HTTP/body rate limits.
 */
export async function shopeeApiGet(url: string, retries = 3, delay = 1500): Promise<any> {
    try {
        const response = await axios.get(url);
        const data = response.data;
        if (data && data.error && (
            data.error.includes('rate_limit') || 
            data.error.includes('frequency') || 
            data.error.includes('busy') ||
            data.message?.toLowerCase().includes('rate') ||
            data.message?.toLowerCase().includes('limit') ||
            data.message?.toLowerCase().includes('frequency')
        )) {
            if (retries > 0) {
                console.warn(`Shopee API body-level error ${data.error}: ${data.message || ''}. Retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return shopeeApiGet(url, retries - 1, delay * 2);
            }
        }
        return response;
    } catch (error: any) {
        const isRateLimitOrServer = error.response?.status === 429 || error.response?.status >= 500;
        if (retries > 0 && isRateLimitOrServer) {
            console.warn(`Shopee API HTTP error ${error.response?.status || 'unknown'}: ${error.message}. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return shopeeApiGet(url, retries - 1, delay * 2);
        }
        throw error;
    }
}

/**
 * Helper to execute a Shopee POST API call with retries and exponential backoff on HTTP/body rate limits.
 */
export async function shopeeApiPost(url: string, body: any, config: any, retries = 3, delay = 1500): Promise<any> {
    try {
        const response = await axios.post(url, body, config);
        const data = response.data;
        if (data && data.error && (
            data.error.includes('rate_limit') || 
            data.error.includes('frequency') || 
            data.error.includes('busy') ||
            data.message?.toLowerCase().includes('rate') ||
            data.message?.toLowerCase().includes('limit') ||
            data.message?.toLowerCase().includes('frequency')
        )) {
            if (retries > 0) {
                console.warn(`Shopee API body-level error ${data.error}: ${data.message || ''}. Retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return shopeeApiPost(url, body, config, retries - 1, delay * 2);
            }
        }
        return response;
    } catch (error: any) {
        const isRateLimitOrServer = error.response?.status === 429 || error.response?.status >= 500;
        if (retries > 0 && isRateLimitOrServer) {
            console.warn(`Shopee API HTTP error ${error.response?.status || 'unknown'}: ${error.message}. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return shopeeApiPost(url, body, config, retries - 1, delay * 2);
        }
        throw error;
    }
}

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
    const response = await shopeeApiPost(url, {
        code,
        partner_id: PARTNER_ID,
        shop_id: parseInt(shopId as any, 10)
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
    const response = await shopeeApiPost(url, {
        refresh_token: refreshToken,
        partner_id: PARTNER_ID,
        shop_id: parseInt(shopId as any, 10)
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
    expireInSeconds?: number,
    refreshExpireInSeconds?: number
) {
    // Standard Shopee access token validity is 4 hours (14400 seconds)
    const expire = (expireInSeconds !== undefined && expireInSeconds !== null && !isNaN(expireInSeconds)) ? expireInSeconds : 14400;
    // Standard Shopee refresh token validity is 30 days (2592000 seconds)
    const refreshExpire = (refreshExpireInSeconds !== undefined && refreshExpireInSeconds !== null && !isNaN(refreshExpireInSeconds)) ? refreshExpireInSeconds : 2592000;

    const accessTokenExpiresAt = new Date(Date.now() + expire * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + refreshExpire * 1000);

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
export async function getValidShopeeToken(shopId: number, forceRefresh = false): Promise<string> {
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

    // If token is expired, will expire in less than 5 minutes, or forceRefresh is true
    if (forceRefresh || (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000)) {
        console.log(`Access token for Shopee shop ${shopId} is expired, close to expiry, or force-refreshed. Refreshing...`);
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
    const SHOPEE_SHOP_NAMES: Record<number, string> = {
        1298030530: 'him.drsamhan',
        1077500606: 'him.drsamhan1',
        1256177782: 'him.drsamhan2',
        1285322524: 'him.drsamhan3',
        1290223366: 'him.drsamhan4',
        1245549673: 'Vigomax+Hq',
        793855746: 'vigomaxplus08',
        562396517: 'drsamhansharing'
    };


    if (SHOPEE_SHOP_NAMES[shopId]) {
        return { shop_name: SHOPEE_SHOP_NAMES[shopId] };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/get_shop_info';
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);

    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;

    console.log(`Fetching Shopee shop info for shop ${shopId}...`);
    const response = await shopeeApiGet(url);
    const data = response.data;
    
    if (data.error) {
        throw new Error(`Shopee shop info error: ${data.message || data.error}`);
    }

    const shopName = data.shop_name || data.response?.shop_name || `Shopee Shop ${shopId}`;
    return { 
        shop_name: shopName 
    };
}

/**
 * Parses dates timezone-safely to Asia/Kuala_Lumpur (GMT+8).
 */
function parseDateGMT8(dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
    return new Date(isoString);
}

/**
 * Fetches order list and details, calculating timezone-safe GMV and order count.
 */
export async function fetchShopeeGMVAndOrders(
    shopId: number,
    accessToken: string,
    startDateStr: string,
    endDateStr: string
) {
    const runWithToken = async (token: string) => {
        const start = parseDateGMT8(startDateStr, 0, 0, 0, 0);
        const end = parseDateGMT8(endDateStr, 23, 59, 59, 999);
        
        const timeFrom = Math.floor(start.getTime() / 1000);
        const timeTo = Math.floor(end.getTime() / 1000);

        const allOrderSns: string[] = [];
        let hasMore = true;
        let cursor = "";

        while (hasMore) {
            const timestamp = Math.floor(Date.now() / 1000);
            const path = '/api/v2/order/get_order_list';
            const sign = generateShopeeSignature(path, timestamp, token, shopId);
            
            let url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopId}`;
            url += `&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=50`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }

            console.log(`Fetching Shopee orders list for ${shopId} with cursor: "${cursor}"...`);
            let response;
            try {
                response = await shopeeApiGet(url);
            } catch (error: any) {
                console.error(`Axios GET error calling Shopee get_order_list API:`, error.message);
                if (error.response?.data) {
                    console.error(`Shopee API error detail:`, JSON.stringify(error.response.data));
                    const errMsg = error.response.data.message || error.response.data.error || JSON.stringify(error.response.data);
                    throw new Error(`Shopee API error: ${errMsg} (HTTP ${error.response.status})`);
                }
                throw error;
            }
            const data = response.data;

            if (data.error) {
                throw new Error(`Shopee get_order_list error: ${data.message || data.error}`);
            }

            const resp = data.response;
            if (resp) {
                const orders = resp.order_list || [];
                orders.forEach((o: { order_sn?: string }) => {
                    if (o.order_sn) {
                        allOrderSns.push(o.order_sn);
                    }
                });
                hasMore = !!resp.more;
                cursor = resp.next_cursor || "";
            } else {
                hasMore = false;
            }
        }

        const chunkedOrderSns: string[][] = [];
        for (let i = 0; i < allOrderSns.length; i += 50) {
            chunkedOrderSns.push(allOrderSns.slice(i, i + 50));
        }

        let totalGMV = 0;
        let validOrderCount = 0;
        const uniqueBuyers = new Set<number | string>();
        const ordersDetails: {
            id: string;
            status: string;
            createTime: number;
            gmv: number;
            itemCount: number;
            buyerUserId: number | string | null;
            isIncluded: boolean;
        }[] = [];
        let fetchedShopName = `Shopee Shop ${shopId}`;

        for (const chunk of chunkedOrderSns) {
            const timestamp = Math.floor(Date.now() / 1000);
            const path = '/api/v2/order/get_order_detail';
            const sign = generateShopeeSignature(path, timestamp, token, shopId);
            
            const orderSnListStr = chunk.join(',');
            const optionalFields = 'buyer_user_id,total_amount,item_list,order_status';
            
            let url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopId}`;
            url += `&order_sn_list=${encodeURIComponent(orderSnListStr)}&response_optional_fields=${encodeURIComponent(optionalFields)}`;

            console.log(`Fetching Shopee order details for batch of ${chunk.length}...`);
            let response;
            try {
                response = await shopeeApiGet(url);
            } catch (error: any) {
                console.error(`Axios GET error calling Shopee get_order_detail API:`, error.message);
                if (error.response?.data) {
                    console.error(`Shopee API error detail:`, JSON.stringify(error.response.data));
                    const errMsg = error.response.data.message || error.response.data.error || JSON.stringify(error.response.data);
                    throw new Error(`Shopee API error: ${errMsg} (HTTP ${error.response.status})`);
                }
                throw error;
            }
            const data = response.data;

            if (data.error) {
                throw new Error(`Shopee get_order_detail error: ${data.message || data.error}`);
            }

            const resp = data.response;
            if (resp && resp.order_list) {
                for (const order of resp.order_list) {
                    const status = order.order_status?.toUpperCase();
                    const isIncluded = status !== 'CANCELLED' && status !== 'TO_RETURN' && status !== 'UNPAID';
                    
                    // Calculate item-level discounted subtotal (original price before customer vouchers are applied)
                    let productSubtotal = 0;
                    if (order.item_list) {
                        order.item_list.forEach((item: any) => {
                            const priceVal = item.model_discounted_price !== undefined ? item.model_discounted_price : (item.model_original_price !== undefined ? item.model_original_price : 0);
                            productSubtotal += parseFloat(priceVal || 0) * (item.model_quantity_purchased || 1);
                        });
                    }

                    ordersDetails.push({
                        id: order.order_sn,
                        status: order.order_status,
                        createTime: order.create_time, // UNIX timestamp in seconds
                        gmv: productSubtotal,
                        itemCount: order.item_list?.length || 0,
                        buyerUserId: order.buyer_user_id || null,
                        isIncluded
                    });

                    if (isIncluded) {
                        totalGMV += productSubtotal;
                        validOrderCount++;
                        if (order.buyer_user_id) {
                            uniqueBuyers.add(order.buyer_user_id);
                        }
                    }
                }
            }
        }

        // Try to get dynamic shop name from getShopeeShopInfo or fallback
        try {
            const info = await getShopeeShopInfo(shopId, token);
            if (info && info.shop_name) {
                fetchedShopName = info.shop_name;
            }
        } catch {
            // Fallback is okay
        }

        return {
            shopName: fetchedShopName,
            gmv: totalGMV,
            orderCount: validOrderCount,
            totalOrderCount: allOrderSns.length,
            uniqueCustomers: uniqueBuyers.size,
            orders: ordersDetails
        };
    };

    try {
        return await runWithToken(accessToken);
    } catch (error: any) {
        const isInvalidToken = error.message?.includes('Invalid access_token') || 
                               error.message?.includes('invalid access_token') ||
                               error.message?.includes('Invalid token') ||
                               error.message?.includes('invalid token') ||
                               (error.response?.data && JSON.stringify(error.response.data).includes('access_token'));
                               
        if (isInvalidToken) {
            console.warn(`Shopee Access Token for shop ${shopId} is invalid or expired in fetchShopeeGMVAndOrders. Forcing a token refresh...`);
            try {
                const newToken = await getValidShopeeToken(shopId, true);
                return await runWithToken(newToken);
            } catch (refreshErr: any) {
                console.error(`Shopee token force-refresh failed during recovery in fetchShopeeGMVAndOrders:`, refreshErr.message);
                throw error;
            }
        }
        throw error;
    }
}

/**
 * Fetches CPC ad spend for a single date, formatting in DD-MM-YYYY.
 */
export async function fetchShopeeAdsSpendForDate(
    shopId: number,
    accessToken: string,
    dateStr: string
): Promise<{ totalSpend: number; hourlySpend: number[] }> {
    const [year, month, day] = dateStr.split('-');
    const performanceDate = `${day}-${month}-${year}`;

    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/ads/get_all_cpc_ads_hourly_performance';
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);

    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&performance_date=${performanceDate}`;
    const hourlySpend = Array.from({ length: 24 }, () => 0);

    try {
        console.log(`Fetching Shopee Ads CPC performance for ${shopId} on ${dateStr} (${performanceDate})...`);
        const response = await shopeeApiGet(url);
        const data = response.data;

        if (data.error) {
            console.warn(`Shopee CPC ads hourly API error for shop ${shopId} on ${dateStr}: ${data.message || data.error}`);
            if (data.error.includes('rate_limit') || data.error.includes('token') || data.error.includes('authorize')) {
                throw new Error(`Shopee Open API error: ${data.message || data.error}`);
            }
            return { totalSpend: 0, hourlySpend };
        }

        const resp = data.response;
        let list: any[] = [];
        if (Array.isArray(resp)) {
            list = resp;
        } else if (resp) {
            list = resp.list || resp.cpc_ads_hourly_performance_list || [];
        }

        let totalSpend = 0;
        for (const item of list) {
            // Shopee CPC Ads API uses 'expense' field for CPC spend, fallback to 'cost'
            const costVal = item.expense !== undefined ? item.expense : (item.cost !== undefined ? item.cost : 0);
            const cost = parseFloat(costVal || 0);
            totalSpend += cost;

            if (item.hourly_time) {
                const hDate = new Date(item.hourly_time * 1000);
                const klDate = new Date(hDate.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
                const hour = klDate.getHours();
                if (hour >= 0 && hour < 24) {
                    hourlySpend[hour] += cost;
                }
            } else if (item.hour !== undefined) {
                const hour = parseInt(item.hour, 10);
                if (hour >= 0 && hour < 24) {
                    hourlySpend[hour] += cost;
                }
            }
        }

        return { totalSpend, hourlySpend };
    } catch (error: any) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to fetch Shopee CPC ads for ${shopId} on ${dateStr}:`, msg);
        if (msg.includes('429') || msg.includes('token') || msg.includes('auth') || msg.includes('Rate limit')) {
            throw error;
        }
        return { totalSpend: 0, hourlySpend };
    }
}

/**
 * Fetches Meta (Facebook) CPAS Ads spend for a single date timezone-safely from the Meta Marketing API.
 */
export async function fetchMetaCPASSpendForDate(
    shopId: number,
    dateStr: string
): Promise<number> {
    const numericShopId = typeof shopId === 'string' ? parseInt(shopId, 10) : shopId;
    const ALLOWED_CPAS_SHOPS = [1298030530, 1077500606, 1256177782];
    if (!ALLOWED_CPAS_SHOPS.includes(numericShopId)) {
        return 0; // No CPAS allowed for other shops
    }

    const accessToken = process.env.FB_ACCESS_TOKEN;
    console.log(`[trace] fetchMetaCPASSpendForDate: shopId=${shopId} (numeric=${numericShopId}), dateStr=${dateStr}, tokenLength=${accessToken ? accessToken.length : 'undefined'}`);
    if (!accessToken) {
        return 0; // Meta Ads not configured, fail-silent
    }

    const SHOPEE_FB_AD_ACCOUNTS: Record<number, string> = {
        1298030530: process.env.SHOPEE_FB_AD_ACCOUNT_1298030530 || '1462603651298383', // HIM by Dr Samhan
        1077500606: process.env.SHOPEE_FB_AD_ACCOUNT_1077500606 || '1199749218961620', // HIM by Dr Samhan 1
        1256177782: process.env.SHOPEE_FB_AD_ACCOUNT_1256177782 || '1199749218961620', // HIM by Dr Samhan 2
    };

    const SHOPEE_FB_CAMPAIGN_FILTERS: Record<number, string> = {
        1077500606: 'HIM.DRSAMHAN1',
        1256177782: 'HIM.DRSAMHAN2'
    };

    let adAccountId = SHOPEE_FB_AD_ACCOUNTS[numericShopId];
    if (!adAccountId) {
        return 0; // No FB ad account configured for this shop
    }

    // Ensure the ad account ID has the "act_" prefix required by Meta Graph API
    if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
    }

    const campaignFilter = SHOPEE_FB_CAMPAIGN_FILTERS[numericShopId];

    try {
        const timeRange = JSON.stringify({ since: dateStr, until: dateStr });
        
        if (campaignFilter) {
            const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?access_token=${accessToken}&level=campaign&fields=campaign_name,spend&time_range=${encodeURIComponent(timeRange)}&limit=100`;
            console.log(`Fetching Meta CPAS campaign-level spend for shop ${numericShopId} (${adAccountId}) with filter "${campaignFilter}" on ${dateStr}...`);
            
            const response = await axios.get(url);
            const data = response.data;
            const insights = data.data || [];
            
            let totalFilteredSpend = 0;
            const filterUpper = campaignFilter.toUpperCase();
            
            insights.forEach((item: any) => {
                const campaignName = item.campaign_name || '';
                const spend = parseFloat(item.spend || '0');
                if (campaignName.toUpperCase().includes(filterUpper)) {
                    totalFilteredSpend += spend;
                    console.log(`  Matching Campaign: "${campaignName}" | Spend: RM ${spend.toFixed(2)}`);
                }
            });
            
            console.log(`Total filtered Meta CPAS spend for shop ${numericShopId} on ${dateStr}: RM ${totalFilteredSpend.toFixed(2)}`);
            return totalFilteredSpend;
        } else {
            const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?access_token=${accessToken}&level=account&fields=spend&time_range=${encodeURIComponent(timeRange)}`;
            console.log(`Fetching Meta CPAS account-level spend for shop ${numericShopId} (${adAccountId}) on ${dateStr}...`);
            
            const response = await axios.get(url);
            const data = response.data;
            const insights = data.data || [];
            if (insights.length > 0 && insights[0].spend) {
                const spend = parseFloat(insights[0].spend);
                console.log(`Meta CPAS spend for shop ${numericShopId} on ${dateStr}: RM ${spend.toFixed(2)}`);
                return spend;
            }
            return 0;
        }
    } catch (error: any) {
        console.warn(`Failed to fetch Meta CPAS spend for shop ${numericShopId} on ${dateStr}:`, error.message);
        if (error.response?.data) {
            console.warn(`Meta API Error Detail:`, JSON.stringify(error.response.data));
        }
        return 0;
    }
}

/**
 * High-level orchestrator fetching both Order details and CPC Ad spends timezone-safely,
 * adding tax and WHT computations.
 */
export async function fetchShopeeAllCpcDailyPerformanceForDate(
    shopId: number,
    accessToken: string,
    dateStr: string
): Promise<{
    impression: number;
    clicks: number;
    broadOrder: number;
    broadGmv: number;
    expense: number;
}> {
    const [year, month, day] = dateStr.split('-');
    const performanceDate = `${day}-${month}-${year}`; // DD-MM-YYYY
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/ads/get_all_cpc_ads_daily_performance';
    const sign = generateShopeeSignature(path, timestamp, accessToken, shopId);
    const url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&start_date=${performanceDate}&end_date=${performanceDate}`;
    
    try {
        const response = await shopeeApiGet(url);
        const data = response.data;
        if (data.error) {
            console.warn(`Shopee CPC daily API error for shop ${shopId} on ${dateStr}: ${data.message || data.error}`);
            if (data.error.includes('rate_limit') || data.error.includes('token') || data.error.includes('authorize')) {
                throw new Error(`Shopee Open API error: ${data.message || data.error}`);
            }
            return { impression: 0, clicks: 0, broadOrder: 0, broadGmv: 0, expense: 0 };
        }
        if (data.response && Array.isArray(data.response) && data.response.length > 0) {
            const perf = data.response[0];
            return {
                impression: perf.impression || 0,
                clicks: perf.clicks || 0,
                broadOrder: perf.broad_order || 0,
                broadGmv: parseFloat(perf.broad_gmv || 0),
                expense: parseFloat(perf.expense || 0)
            };
        }
        return { impression: 0, clicks: 0, broadOrder: 0, broadGmv: 0, expense: 0 };
    } catch (e: any) {
        console.warn(`Failed to fetch Shopee CPC daily performance for shop ${shopId}:`, e.message);
        if (e.message?.includes('429') || e.message?.includes('token') || e.message?.includes('auth') || e.message?.includes('Rate limit')) {
            throw e;
        }
        return { impression: 0, clicks: 0, broadOrder: 0, broadGmv: 0, expense: 0 };
    }
}

export async function fetchShopeeShopPerformance(
    shopId: number,
    startDateStr: string,
    endDateStr: string
) {
    const accessToken = await getValidShopeeToken(shopId);

    // Fetch order metrics concurrently
    const orderData = await fetchShopeeGMVAndOrders(shopId, accessToken, startDateStr, endDateStr);

    // Fetch CPC ads spend concurrently for each date in range
    const dates: string[] = [];
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const daySpan = differenceInDays(end, start) + 1;

    for (let i = 0; i < daySpan; i++) {
        const date = format(subDays(end, daySpan - 1 - i), 'yyyy-MM-dd');
        dates.push(date);
    }

    // Fetch both Shopee native CPC spends, Meta CPAS spends, and daily CPC performance in parallel
    const [adsResults, cpasResults, dailyPerfResults] = await Promise.all([
        Promise.all(
            dates.map(date => fetchShopeeAdsSpendForDate(shopId, accessToken, date))
        ),
        Promise.all(
            dates.map(date => fetchMetaCPASSpendForDate(shopId, date).catch(() => 0))
        ),
        Promise.all(
            dates.map(date => fetchShopeeAllCpcDailyPerformanceForDate(shopId, accessToken, date))
        )
    ]);

    // Use daily performance API expense as authoritative CPC spend (matches Shopee Seller Center "Cost" column).
    // The hourly API sum is kept only for the hourly chart breakdown.
    const hourlyBasedCpcSpend = adsResults.reduce((sum, res) => sum + res.totalSpend, 0);
    const dailyExpenseTotal = dailyPerfResults.reduce((sum, res) => sum + res.expense, 0);
    // Prefer daily performance expense (more accurate); fall back to hourly sum if daily returns 0
    const shopeeCpcSpend = dailyExpenseTotal > 0 ? dailyExpenseTotal : hourlyBasedCpcSpend;
    const cpasSpend = cpasResults.reduce((sum, res) => sum + res, 0);
    const spendBeforeTax = shopeeCpcSpend + cpasSpend;

    // TAX calculations: SST (8%) & WHT (8%)
    const sst = spendBeforeTax * 0.08;
    const wht = spendBeforeTax * 0.08;
    const spendAfterTax = spendBeforeTax + sst + wht;

    const roasBeforeTax = spendBeforeTax > 0 ? orderData.gmv / spendBeforeTax : 0;
    const roasAfterTax = spendAfterTax > 0 ? orderData.gmv / spendAfterTax : 0;

    const adImpressions = dailyPerfResults.reduce((sum, res) => sum + res.impression, 0);
    const adClicks = dailyPerfResults.reduce((sum, res) => sum + res.clicks, 0);
    const adOrders = dailyPerfResults.reduce((sum, res) => sum + res.broadOrder, 0);
    const adSales = dailyPerfResults.reduce((sum, res) => sum + res.broadGmv, 0);

    return {
        shopId,
        shopName: orderData.shopName,
        gmv: orderData.gmv,
        orderCount: orderData.orderCount,
        totalOrderCount: orderData.totalOrderCount,
        uniqueCustomers: orderData.uniqueCustomers,
        spendBeforeTax,
        spendAfterTax,
        cpasSpend,
        shopeeCpcSpend,
        sst,
        wht,
        roasBeforeTax,
        roasAfterTax,
        orders: orderData.orders,
        adsHourlyBreakdowns: adsResults.map((r, i) => ({
            date: dates[i],
            hourlySpend: r.hourlySpend
        })),
        adImpressions,
        adClicks,
        adOrders,
        adSales
    };
}


