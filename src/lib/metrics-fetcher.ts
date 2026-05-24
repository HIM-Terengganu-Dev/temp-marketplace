import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import { getShopCredentials } from './tiktok-shop-credentials';
import { query } from './db';

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_SHOP = '/order/202309/orders/search';
const VERSION_SHOP = '202309';

const BASE_URL_ADS = 'https://business-api.tiktok.com';
const API_VERSION_ADS = 'v1.3';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

export const SHOPS: Record<string, {
    name: string;
    shopId: string;
    advertiserId: string;
    accessTokenEnv: string;
    hasGMVCampaigns: boolean;
}> = {
    '1': {
        name: 'HIM by Dr Samhan',
        shopId: '7495609155379170274',
        advertiserId: '7505228077656621057',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN',
        hasGMVCampaigns: true
    },
    '2': {
        name: 'HIM CLINIC',
        shopId: '7495102143139318172',
        advertiserId: '7404387549454008336',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN',
        hasGMVCampaigns: false
    },
    '3': {
        name: 'Vigomax HQ',
        shopId: '7494799386964364219',
        advertiserId: '7259935704698929153',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN',
        hasGMVCampaigns: true
    },
    '4': {
        name: 'VigomaxPlus HQ',
        shopId: '7495580262600706099',
        advertiserId: '7259935704698929153',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN',
        hasGMVCampaigns: true
    }
};

function parseDateGMT8(dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
    return new Date(isoString);
}

export async function fetchShopGMV(shopNumber: number, startDateStr: string, endDateStr: string) {
    const start = parseDateGMT8(startDateStr, 0, 0, 0, 0);
    const end = parseDateGMT8(endDateStr, 23, 59, 59, 999);

    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);

    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        throw new Error(`Failed to get credentials for shop ${shopNumber}`);
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        throw new Error('Missing TikTok Shop App Key, App Secret or Cipher');
    }

    let allOrders: any[] = [];
    let nextPageToken = '';
    let hasMore = true;
    let totalGMV = 0;

    while (hasMore) {
        const queryParams: any = {
            access_token: accessToken,
            app_key: appKey,
            shop_cipher: shopCipher,
            shop_id: '',
            version: VERSION_SHOP,
            page_size: 50
        };

        if (nextPageToken) {
            queryParams.page_token = nextPageToken;
        }

        const baseUrlWithoutSlash = BASE_URL_SHOP.endsWith('/') ? BASE_URL_SHOP.slice(0, -1) : BASE_URL_SHOP;

        const sortedKeys = Object.keys(queryParams).sort();
        const queryString = sortedKeys
            .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
            .join('&');

        const urlForSignature = `${baseUrlWithoutSlash}${ENDPOINT_SHOP}?${queryString}`;

        const requestBody = {
            create_time_ge: startTime,
            create_time_lt: endTime
        };

        const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

        const finalQueryParams: any = { ...queryParams };
        finalQueryParams.sign = signatureResult.signature;
        finalQueryParams.timestamp = signatureResult.timestamp;

        const finalSortedKeys = Object.keys(finalQueryParams).sort();
        const finalQueryString = finalSortedKeys
            .map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`)
            .join('&');

        const finalUrl = `${baseUrlWithoutSlash}${ENDPOINT_SHOP}?${finalQueryString}`;

        const response = await axios.post(finalUrl, requestBody, {
            headers: {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code !== 0) {
            throw new Error(response.data.message || 'TikTok API Error');
        }

        const data = response.data.data;
        const orders = data.orders || [];

        if (orders.length > 0) {
            allOrders = allOrders.concat(orders);
        }

        nextPageToken = data.next_page_token;
        hasMore = !!nextPageToken;
    }

    const uniqueBuyerIds = new Set<string>();
    const orderDetails: any[] = [];

    allOrders.forEach(order => {
        let orderTotal = 0;
        if (order.line_items) {
            order.line_items.forEach((item: any) => {
                orderTotal += parseFloat(item.sale_price || '0') + parseFloat(item.platform_discount || '0');
            });
        }

        const buyerUserId = order.buyer_user_id || order.user_id;
        if (buyerUserId) {
            uniqueBuyerIds.add(buyerUserId);
        }

        orderDetails.push({
            id: order.id,
            status: order.status,
            createTime: order.create_time,
            gmv: orderTotal,
            itemCount: order.line_items?.length || 0,
            buyerUserId: buyerUserId || null,
            isIncluded: true
        });

        const orderStatus = order.status?.toUpperCase();
        if (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED') {
            const lastOrder = orderDetails[orderDetails.length - 1];
            if (lastOrder) {
                lastOrder.isIncluded = false;
            }
            return;
        }

        totalGMV += orderTotal;
    });

    const validOrders = allOrders.filter(order => {
        const orderStatus = order.status?.toUpperCase();
        return orderStatus !== 'CANCELLED' && orderStatus !== 'REFUNDED';
    });

    return {
        shopName: shopCredentials.shop_name,
        gmv: totalGMV,
        orderCount: validOrders.length,
        totalOrderCount: allOrders.length,
        uniqueCustomers: uniqueBuyerIds.size,
        orders: orderDetails
    };
}

export async function fetchShopAnalytics(shopNumber: number, startDateStr: string, endDateStr: string) {
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        throw new Error(`Failed to get credentials for shop ${shopNumber}`);
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    const queryParams: any = {
        access_token: accessToken,
        app_key: appKey,
        shop_cipher: shopCipher,
        shop_id: '',
        version: '202405',
        start_date_ge: startDateStr,
        end_date_lt: endDateStr
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
    const urlForSignature = `${BASE_URL_SHOP}/analytics/202405/shop/performance?${queryString}`;

    const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, {});

    const finalQueryParams: any = { ...queryParams };
    finalQueryParams.sign = signatureResult.signature;
    finalQueryParams.timestamp = signatureResult.timestamp;

    const finalSortedKeys = Object.keys(finalQueryParams).sort();
    const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
    const finalUrl = `${BASE_URL_SHOP}/analytics/202405/shop/performance?${finalQueryString}`;

    try {
        const response = await axios.get(finalUrl, {
            headers: {
                'x-tts-access-token': accessToken
            }
        });

        if (response.data.code !== 0) {
            console.error(`Shop ${shopNumber} Analytics API Error:`, response.data.message);
            return null;
        }

        const data = response.data.data;
        if (!data || !data.performance || !data.performance.intervals || data.performance.intervals.length === 0) {
            return null;
        }

        // Just sum up intervals if multiple, or return the first if one date
        let totalVisitors = 0;
        let totalImpressions = 0;
        let visitorBreakdowns = { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 };
        let impressionBreakdowns = { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 };

        data.performance.intervals.forEach((interval: any) => {
            totalVisitors += interval.avg_product_page_visitors || 0;
            totalImpressions += interval.product_impressions || 0;

            if (interval.avg_product_page_visitor_breakdowns) {
                interval.avg_product_page_visitor_breakdowns.forEach((b: any) => {
                    if (b.type === 'LIVE') visitorBreakdowns.LIVE += b.amount;
                    if (b.type === 'VIDEO') visitorBreakdowns.VIDEO += b.amount;
                    if (b.type === 'PRODUCT_CARD') visitorBreakdowns.PRODUCT_CARD += b.amount;
                });
            }

            if (interval.product_impression_breakdowns) {
                interval.product_impression_breakdowns.forEach((b: any) => {
                    if (b.type === 'LIVE') impressionBreakdowns.LIVE += b.amount;
                    if (b.type === 'VIDEO') impressionBreakdowns.VIDEO += b.amount;
                    if (b.type === 'PRODUCT_CARD') impressionBreakdowns.PRODUCT_CARD += b.amount;
                });
            }
        });

        return {
            visitors: totalVisitors,
            impressions: totalImpressions,
            visitorBreakdowns,
            impressionBreakdowns
        };
    } catch (e: any) {
        console.error(`Error fetching analytics for shop ${shopNumber}:`, e.message);
        return null;
    }
}


async function getGMVMaxCampaignIds(accessToken: string, advertiserId: string, promotionType: string): Promise<Set<string>> {
    const campaignIds = new Set<string>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: advertiserId,
            filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
            page: page.toString(),
            page_size: '100'
        });

        const url = `${BASE_URL_ADS}/open_api/${API_VERSION_ADS}/gmv_max/campaign/get/?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.code !== 0) break;

            const list = data.data?.list || [];
            list.forEach((c: any) => campaignIds.add(c.campaign_id));

            const pageInfo = data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
            }
        } catch {
            break;
        }
    }

    return campaignIds;
}

async function fetchGMVMaxCost(accessToken: string, advertiserId: string, shopId: string, startDate: string, endDate: string, promotionType: string): Promise<number> {
    const validCampaignIds = await getGMVMaxCampaignIds(accessToken, advertiserId, promotionType);

    const params = new URLSearchParams({
        advertiser_id: advertiserId,
        store_ids: JSON.stringify([shopId]),
        dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
        metrics: JSON.stringify(['cost']),
        start_date: startDate,
        end_date: endDate,
        page_size: '1000'
    });

    const url = `${BASE_URL_ADS}/open_api/${API_VERSION_ADS}/gmv_max/report/get/?${params.toString()}`;

    const MAX_RETRIES = 3;
    let delayMs = 1000; // start at 1 second, doubles each retry

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.code === 40100) {
                // Rate limit hit — wait and retry
                console.warn(`[GMV Max] Rate limit (40100) on attempt ${attempt}/${MAX_RETRIES} for ${promotionType}. Retrying in ${delayMs}ms...`);
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 2;
                    continue;
                } else {
                    console.error(`[GMV Max] Rate limit persisted after ${MAX_RETRIES} retries for ${promotionType}. Returning 0.`);
                    return 0;
                }
            }

            if (data.code !== 0) {
                console.error('GMV Max report error:', data);
                return 0;
            }

            const list = data.data?.list || [];
            const filteredList = list.filter((item: any) => validCampaignIds.has(item.dimensions.campaign_id));

            let totalCost = 0;
            filteredList.forEach((item: any) => {
                totalCost += parseFloat(item.metrics.cost || 0);
            });

            return totalCost;
        } catch (error) {
            console.error('Error fetching GMV Max cost:', error);
            return 0;
        }
    }

    return 0;
}

async function getGMVMaxCampaignIdsForAccount(advertiserId: string, accessToken: string): Promise<Set<string>> {
    const gmvMaxIds = new Set<string>();

    for (const promotionType of ['PRODUCT_GMV_MAX', 'LIVE_GMV_MAX']) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const params = new URLSearchParams({
                advertiser_id: advertiserId,
                filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
                page: page.toString(),
                page_size: '100'
            });

            const url = `${BASE_URL_ADS}/open_api/${API_VERSION_ADS}/gmv_max/campaign/get/?${params.toString()}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.code !== 0) break;

                const list = data.data?.list || [];
                list.forEach((c: any) => gmvMaxIds.add(c.campaign_id));

                const pageInfo = data.data?.page_info;
                if (page >= (pageInfo?.total_page || 1)) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch {
                break;
            }
        }
    }

    return gmvMaxIds;
}

async function fetchManualCampaignSpend(advertiserId: string, accessToken: string, startDate: string, endDate: string, shopId?: string): Promise<number> {
    let totalSpend = 0;

    try {
        const gmvMaxIds = await getGMVMaxCampaignIdsForAccount(advertiserId, accessToken);

        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const paramObj: Record<string, string> = {
                advertiser_id: advertiserId,
                report_type: 'BASIC',
                data_level: 'AUCTION_CAMPAIGN',
                dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
                metrics: JSON.stringify(['spend']),
                start_date: startDate,
                end_date: endDate,
                page: page.toString(),
                page_size: '1000'
            };

            // When a specific shopId is given, scope spend to that store only
            if (shopId) {
                paramObj.store_ids = JSON.stringify([shopId]);
            }

            const params = new URLSearchParams(paramObj);
            const url = `${BASE_URL_ADS}/open_api/${API_VERSION_ADS}/report/integrated/get/?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.code !== 0) break;

            const list = data.data?.list || [];

            list.forEach((item: any) => {
                const campaignId = item.dimensions?.campaign_id;
                if (campaignId && !gmvMaxIds.has(campaignId)) {
                    totalSpend += parseFloat(item.metrics.spend || 0);
                }
            });

            const pageInfo = data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
            }
        }
    } catch (error) {
        console.error(`Error fetching manual spend:`, error);
    }

    return totalSpend;
}

export async function fetchShopROAS(shopNumber: number, startDateStr: string, endDateStr: string) {
    const shopConfig = SHOPS[shopNumber.toString()];
    if (!shopConfig) {
        throw new Error(`Invalid shop number: ${shopNumber}`);
    }

    const accessToken = cleanEnv(process.env[shopConfig.accessTokenEnv]);

    if (!accessToken) {
        throw new Error(`Missing Access Token for ${shopConfig.name}`);
    }

    let liveGMVMaxCost = 0;
    let productGMVMaxCost = 0;
    let manualCampaignSpend = 0;

    if (shopConfig.hasGMVCampaigns) {
        // Serialize these to avoid concurrent Ads API pressure which can trigger rate limits
        liveGMVMaxCost = await fetchGMVMaxCost(accessToken, shopConfig.advertiserId, shopConfig.shopId, startDateStr, endDateStr, 'LIVE_GMV_MAX');
        productGMVMaxCost = await fetchGMVMaxCost(accessToken, shopConfig.advertiserId, shopConfig.shopId, startDateStr, endDateStr, 'PRODUCT_GMV_MAX');
    }

    // FIX: For shops sharing an advertiser (Shop 3 & 4), manual spend is already 0
    // since all their campaigns are GMV Max. fetchManualCampaignSpend is still
    // called but will return 0 because all campaign IDs are in the GMV Max exclusion set.
    manualCampaignSpend = await fetchManualCampaignSpend(shopConfig.advertiserId, accessToken, startDateStr, endDateStr, shopConfig.shopId);

    // FIX: Sum live + product GMV Max costs (not Math.max which discards one type)
    const gmvMaxCost = liveGMVMaxCost + productGMVMaxCost;
    const totalAdsSpend = gmvMaxCost + manualCampaignSpend;

    const sst = totalAdsSpend * 0.08;
    const wht = totalAdsSpend * 0.08;
    const totalCostWithTaxes = totalAdsSpend + sst + wht;

    return {
        shopName: shopConfig.name,
        liveGMVMaxCost,
        productGMVMaxCost,
        gmvMaxCost,
        manualCampaignSpend,
        totalAdsSpend,
        sst,
        wht,
        totalCostWithTaxes
    };
}

/**
 * Module-level lock to prevent multiple concurrent auto-sync executions.
 * The ROAS API is called 4x per dashboard load — without this, 4 parallel
 * gap-fill scans would fire simultaneously.
 */
let isSyncing = false;

/**
 * Automator to scan the past 30 days (from today - 43 days to today - 13 days)
 * and identify any dates that are missing or have incomplete shop records.
 * Then runs historical backfill/sync in the background sequentially.
 */
export async function ensureDailyMetricsSynced() {
    if (isSyncing) return; // Already running — skip

    try {
        const now = new Date();
        const klTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        
        // Target window: 30 days back starting from 13 days ago (today - 43 days to today - 13 days)
        const endDate = new Date(klTime);
        endDate.setDate(klTime.getDate() - 13);
        const endDateStr = endDate.toISOString().split('T')[0];

        const startDate = new Date(klTime);
        startDate.setDate(klTime.getDate() - 43);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Query database to find any missing or incomplete dates within the 30-day window
        const result = await query(`
            SELECT TO_CHAR(date_series.date::date, 'YYYY-MM-DD') as date_str
            FROM generate_series($1::date, $2::date, '1 day'::interval) as date_series(date)
            LEFT JOIN (
                SELECT date, COUNT(*) as count
                FROM credentials.daily_shop_metrics
                WHERE date >= $1 AND date <= $2
                GROUP BY date
            ) as existing ON existing.date = date_series.date::date
            WHERE existing.count IS NULL OR existing.count < 4
            ORDER BY date_series.date DESC;
        `, [startDateStr, endDateStr]);

        const missingDates = result.rows.map(row => row.date_str);

        if (missingDates.length > 0) {
            console.log(`[Auto-Sync] Found ${missingDates.length} missing/incomplete dates in the last 30 days: ${missingDates.join(', ')}. Triggering background gap-fill...`);
            
            isSyncing = true;
            // Run sync in the background so we don't block the HTTP request
            (async () => {
                try {
                    for (const dateStr of missingDates) {
                        console.log(`[Auto-Sync] Background syncing date: ${dateStr}`);
                        for (const shopNumStr of ['1', '2', '3', '4']) {
                            const shopNumber = parseInt(shopNumStr, 10);
                            const shopConfig = SHOPS[shopNumStr];
                            try {
                                // Check if this specific shop already has data for this date
                                const existingRow = await query(`
                                    SELECT 1 FROM credentials.daily_shop_metrics
                                    WHERE date = $1 AND shop_number = $2
                                `, [dateStr, shopNumber]);

                                if (existingRow.rows.length > 0) {
                                    console.log(`[Auto-Sync] Shop ${shopNumber} already has data for ${dateStr}. Skipping...`);
                                    continue;
                                }

                                const gmvData = await fetchShopGMV(shopNumber, dateStr, dateStr);
                                const roasData = await fetchShopROAS(shopNumber, dateStr, dateStr);
                                
                                const gmv = gmvData.gmv || 0;
                                const orderCount = gmvData.orderCount || 0;
                                const spendBeforeTax = roasData.totalAdsSpend || 0;
                                const spendAfterTax = roasData.totalCostWithTaxes || 0;
                                const roasBeforeTax = spendBeforeTax > 0 ? (gmv / spendBeforeTax) : 0;
                                const roasAfterTax = spendAfterTax > 0 ? (gmv / spendAfterTax) : 0;

                                await query(`
                                    INSERT INTO credentials.daily_shop_metrics (
                                        shop_number, shop_name, date, gmv, spend_before_tax, spend_after_tax, roas_before_tax, roas_after_tax, order_count, updated_at
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                                    ON CONFLICT (shop_number, date) DO UPDATE SET
                                        shop_name = EXCLUDED.shop_name,
                                        gmv = EXCLUDED.gmv,
                                        spend_before_tax = EXCLUDED.spend_before_tax,
                                        spend_after_tax = EXCLUDED.spend_after_tax,
                                        roas_before_tax = EXCLUDED.roas_before_tax,
                                        roas_after_tax = EXCLUDED.roas_after_tax,
                                        order_count = EXCLUDED.order_count,
                                        updated_at = CURRENT_TIMESTAMP
                                `, [shopNumber, gmvData.shopName || shopConfig.name, dateStr, gmv, spendBeforeTax, spendAfterTax, roasBeforeTax, roasAfterTax, orderCount]);
                                
                                console.log(`[Auto-Sync] Synced shop ${shopNumber} successfully for date ${dateStr}`);
                                
                                // Auto-sync livestream metrics for this shop and date as well
                                await syncLivestreamMetricsForDate(shopNumber, dateStr);

                                // Auto-sync affiliate metrics for this shop and date as well
                                await syncAffiliateMetricsForDate(shopNumber, dateStr);
                            } catch (e: any) {
                                console.error(`[Auto-Sync] Failed for shop ${shopNumber} on ${dateStr}:`, e.message);
                            }
                        }
                        // Sleep for 1 second to respect API limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    console.log(`[Auto-Sync] Finished background gap-fill successfully.`);
                } finally {
                    isSyncing = false;
                }
            })().catch(err => {
                isSyncing = false;
                console.error('[Auto-Sync] Critical error in background thread:', err);
            });
        }
    } catch (err: any) {
        isSyncing = false;
        console.error('[Auto-Sync] Global trigger error:', err.message);
    }
}

/**
 * Fetches livestream performance list for a specific shop and date range
 */
export async function fetchShopLivePerformance(shopNumber: number, startDateStr: string, endDateStr: string) {
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        throw new Error(`Failed to get credentials for shop ${shopNumber}`);
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        throw new Error('Missing TikTok Shop App Key, App Secret or Cipher');
    }

    // The TikTok API uses UTC dates for its date range filtering, but lives start in KL time (UTC+8).
    // A session starting at 2AM KL on May 23 = UTC May 22 — the API may return it under May 22.
    // To capture all sessions for a KL date, request a wider UTC window: (startDate - 1) to (endDate + 1),
    // then filter by KL date after the fact.
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const dStart = new Date(Date.UTC(sy, sm - 1, sd - 1)); // one day before start
    const dEnd   = new Date(Date.UTC(ey, em - 1, ed + 1)); // one day after end

    const apiStartDate = dStart.toISOString().split('T')[0];
    const apiEndDate   = dEnd.toISOString().split('T')[0];

    const queryParams: any = {
        access_token: accessToken,
        app_key: appKey,
        shop_cipher: shopCipher,
        shop_id: '',
        version: '202509',
        start_date_ge: apiStartDate,
        end_date_lt: apiEndDate
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
    const urlForSignature = `${BASE_URL_SHOP}/analytics/202509/shop_lives/performance?${queryString}`;

    const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, {});

    const finalQueryParams: any = { ...queryParams };
    finalQueryParams.sign = signatureResult.signature;
    finalQueryParams.timestamp = signatureResult.timestamp;

    const finalSortedKeys = Object.keys(finalQueryParams).sort();
    const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
    const finalUrl = `${BASE_URL_SHOP}/analytics/202509/shop_lives/performance?${finalQueryString}`;

    try {
        console.log(`[TikTok API] Fetching LIVE performance list for shop ${shopNumber} (API window: ${apiStartDate} to ${apiEndDate})...`);
        const response = await axios.get(finalUrl, {
            headers: {
                'x-tts-access-token': accessToken
            }
        });

        if (response.data.code === 0) {
            const sessions = response.data.data?.live_stream_sessions || [];
            const mapped = sessions.map((item: any) => ({
                liveId: item.id,
                liveTitle: item.title || `LIVE Stream ${item.id}`,
                startTime: item.start_time ? new Date(parseInt(item.start_time, 10) * 1000) : null,
                endTime: item.end_time ? new Date(parseInt(item.end_time, 10) * 1000) : null,
                orderCount: parseInt(item.sales_performance?.sku_orders || '0', 10),
                gmv: parseFloat(item.sales_performance?.gmv?.amount || '0.00'),
                viewerCount: parseInt(item.sales_performance?.customers || '0', 10)
            }));

            // Filter sessions to only those that fall on the requested KL date(s)
            const filtered = mapped.filter((s: any) => {
                if (!s.startTime) return false;
                const klDateStr = s.startTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
                return klDateStr >= startDateStr && klDateStr <= endDateStr;
            });

            console.log(`[TikTok API] Got ${sessions.length} sessions from API, ${filtered.length} match KL date range ${startDateStr}~${endDateStr} for shop ${shopNumber}`);
            return filtered;
        } else {
            console.warn(`[TikTok API Warning] Live performance list failed for shop ${shopNumber}:`, response.data.message);
            return [];
        }
    } catch (e: any) {
        console.error(`[TikTok API Error] Failed fetching live performance for shop ${shopNumber}:`, e.message);
        return [];
    }
}

/**
 * Synchronizes livestream metrics for a specific shop and date into the database
 */
export async function syncLivestreamMetricsForDate(shopNumber: number, dateStr: string) {
    try {
        const streams = await fetchShopLivePerformance(shopNumber, dateStr, dateStr);
        for (const stream of streams) {
            await query(`
                INSERT INTO credentials.shop_livestream_performance (
                    shop_number, live_id, live_title, start_time, end_time, order_count, gmv, viewer_count, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                ON CONFLICT (shop_number, live_id) DO UPDATE SET
                    live_title = EXCLUDED.live_title,
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    order_count = EXCLUDED.order_count,
                    gmv = EXCLUDED.gmv,
                    viewer_count = EXCLUDED.viewer_count,
                    updated_at = CURRENT_TIMESTAMP
            `, [shopNumber, stream.liveId, stream.liveTitle, stream.startTime, stream.endTime, stream.orderCount, stream.gmv, stream.viewerCount]);
        }
        console.log(`[Sync] Synced ${streams.length} livestreams for shop ${shopNumber} on ${dateStr}`);
    } catch (e: any) {
        console.error(`[Sync Error] Failed to sync livestreams for shop ${shopNumber} on ${dateStr}:`, e.message);
    }
}

/**
 * Fetches affiliate creator sales performance list for a specific shop and date range
 */
export async function fetchTikTokAffiliatePerformance(shopNumber: number, dateStr: string) {
    const start = parseDateGMT8(dateStr, 0, 0, 0, 0);
    const end = parseDateGMT8(dateStr, 23, 59, 59, 999);

    const startTime = Math.floor(start.getTime() / 1000);
    const endTime = Math.floor(end.getTime() / 1000);

    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        throw new Error(`Failed to get credentials for shop ${shopNumber}`);
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        throw new Error('Missing TikTok Shop App Key, App Secret or Cipher');
    }

    const endpoint = '/affiliate_seller/202410/orders/search';
    let allOrders: any[] = [];
    let pageToken = '';
    let hasMore = true;

    try {
        console.log(`[TikTok API] Fetching Affiliate orders for shop ${shopNumber} on ${dateStr}...`);
        while (hasMore) {
            const queryParams: any = {
                access_token: accessToken,
                app_key: appKey,
                shop_cipher: shopCipher,
                shop_id: '',
                version: '202410',
                page_size: 50
            };

            if (pageToken) {
                queryParams.page_token = pageToken;
            }

            const sortedKeys = Object.keys(queryParams).sort();
            const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(queryParams[k])}`).join('&');
            const urlForSignature = `${BASE_URL_SHOP}${endpoint}?${queryString}`;

            const requestBody = {
                create_time_ge: startTime,
                create_time_lt: endTime
            };

            const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);
            
            const finalParams = { ...queryParams, sign: signatureResult.signature, timestamp: signatureResult.timestamp };
            const finalQueryStr = Object.keys(finalParams).sort().map(k => `${k}=${encodeURIComponent(finalParams[k])}`).join('&');
            const finalUrl = `${BASE_URL_SHOP}${endpoint}?${finalQueryStr}`;

            const response = await axios.post(finalUrl, requestBody, {
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 0) {
                console.warn(`[TikTok Affiliate Warning] Affiliate orders search failed for shop ${shopNumber}:`, response.data.message);
                break;
            }

            const data = response.data.data || {};
            const orders = data.orders || [];
            if (orders.length > 0) {
                allOrders = allOrders.concat(orders);
            }

            pageToken = data.next_page_token || '';
            hasMore = !!pageToken;
        }
    } catch (err: any) {
        console.warn(`[TikTok Affiliate Error] Error calling affiliate orders search for shop ${shopNumber}:`, err.message);
        return [];
    }

    // Process and aggregate by creator_username
    const creatorMap: Record<string, { creatorName: string; orderCount: number; gmv: number; commission: number; ordersSet: Set<string> }> = {};

    allOrders.forEach(order => {
        const orderId = order.id;
        const skus = order.skus || [];

        skus.forEach((sku: any) => {
            const username = sku.creator_username || sku.creator_id || '';
            if (!username) return;

            const name = sku.creator_name || sku.creator_username || username;
            const price = parseFloat(sku.price?.amount || '0');
            const qty = sku.quantity || 1;
            const skuGmv = price * qty;
            
            // Commission
            let skuCommission = parseFloat(sku.commission_amount || sku.creator_commission || sku.estimated_commission || '0');
            if (skuCommission === 0 && sku.commission_rate) {
                skuCommission = skuGmv * (parseFloat(sku.commission_rate) / 100);
            }

            if (!creatorMap[username]) {
                creatorMap[username] = {
                    creatorName: name,
                    orderCount: 0,
                    gmv: 0,
                    commission: 0,
                    ordersSet: new Set()
                };
            }

            creatorMap[username].gmv += skuGmv;
            creatorMap[username].commission += skuCommission;
            creatorMap[username].ordersSet.add(orderId);
        });
    });

    const result = Object.entries(creatorMap).map(([username, c]) => ({
        creatorUsername: username,
        creatorName: c.creatorName,
        orderCount: c.ordersSet.size,
        gmv: c.gmv,
        commission: c.commission
    }));

    console.log(`[TikTok Affiliate] Aggregated ${result.length} unique affiliates for shop ${shopNumber} on ${dateStr}`);
    return result;
}

export async function syncAffiliateMetricsForDate(shopNumber: number, dateStr: string) {
    try {
        const creators = await fetchTikTokAffiliatePerformance(shopNumber, dateStr);
        // Clear existing cache for this shop and date to prevent old duplicates
        await query(`
            DELETE FROM credentials.tiktok_affiliate_performance 
            WHERE shop_number = $1 AND date = $2::date
        `, [shopNumber, dateStr]);

        for (const creator of creators) {
            await query(`
                INSERT INTO credentials.tiktok_affiliate_performance (
                    shop_number, date, creator_username, creator_name, order_count, gmv, commission_amount, updated_at
                ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                ON CONFLICT (shop_number, date, creator_username) DO UPDATE SET
                    creator_name = EXCLUDED.creator_name,
                    order_count = EXCLUDED.order_count,
                    gmv = EXCLUDED.gmv,
                    commission_amount = EXCLUDED.commission_amount,
                    updated_at = CURRENT_TIMESTAMP
            `, [shopNumber, dateStr, creator.creatorUsername, creator.creatorName, creator.orderCount, creator.gmv, creator.commission]);
        }
        console.log(`[Sync] Synced ${creators.length} creator affiliates for shop ${shopNumber} on ${dateStr}`);
    } catch (e: any) {
        console.error(`[Sync Error] Failed to sync creator affiliates for shop ${shopNumber} on ${dateStr}:`, e.message);
    }
}



