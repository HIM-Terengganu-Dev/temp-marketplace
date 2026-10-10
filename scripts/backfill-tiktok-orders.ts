import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import { query, pool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_ORDERS = '/order/202309/orders/search';
const VERSION_ORDERS = '202309';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function batchUpsertOrders(orders: any[], shopNumber: number) {
    if (!orders || orders.length === 0) return 0;

    const values: any[] = [];
    const valueClauses: string[] = [];

    orders.forEach((order, index) => {
        const offset = index * 9;
        const buyerUserId = order.buyer_user_id || order.user_id || null;
        let orderTotal = 0;

        if (order.line_items && Array.isArray(order.line_items)) {
            order.line_items.forEach((item: any) => {
                orderTotal += parseFloat(item.sale_price || '0') + parseFloat(item.platform_discount || '0');
            });
        } else if (order.payment?.total_amount) {
            orderTotal = parseFloat(order.payment.total_amount);
        }

        const createdAt = order.create_time ? new Date(order.create_time * 1000) : new Date();
        const cancelledAt = order.cancel_time ? new Date(order.cancel_time * 1000) : null;
        const updatedAt = order.update_time ? new Date(order.update_time * 1000) : new Date();

        valueClauses.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
        );

        values.push(
            order.id,
            String(shopNumber),
            'tiktok',
            orderTotal,
            order.status || 'UNKNOWN',
            createdAt,
            cancelledAt,
            updatedAt,
            buyerUserId
        );
    });

    const sql = `
        INSERT INTO credentials.orders (
            order_sn, shop_id, marketplace, gmv, order_status, created_at, cancelled_at, updated_at, buyer_user_id
        ) VALUES ${valueClauses.join(', ')}
        ON CONFLICT (order_sn) DO UPDATE SET
            order_status = EXCLUDED.order_status,
            gmv = EXCLUDED.gmv,
            buyer_user_id = COALESCE(EXCLUDED.buyer_user_id, credentials.orders.buyer_user_id),
            cancelled_at = EXCLUDED.cancelled_at,
            updated_at = EXCLUDED.updated_at;
    `;

    await query(sql, values);
    return orders.length;
}

export async function fetchAndSaveOrders(
    shopNumber: number,
    startTime: number,
    endTime: number
): Promise<{ fetched: number; upserted: number }> {
    const shopCredentials = await getShopCredentials(shopNumber);
    if (!shopCredentials) {
        console.error(`[Shop ${shopNumber}] No credentials found.`);
        return { fetched: 0, upserted: 0 };
    }

    const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
    const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
    const accessToken = shopCredentials.access_token;
    const shopCipher = shopCredentials.shop_cipher;

    if (!appKey || !appSecret || !accessToken || !shopCipher) {
        console.error(`[Shop ${shopNumber}] Missing credentials/cipher.`);
        return { fetched: 0, upserted: 0 };
    }

    let nextPageToken = '';
    let hasMore = true;
    let totalFetched = 0;
    let totalUpserted = 0;

    while (hasMore) {
        const queryParams: any = {
            access_token: accessToken,
            app_key: appKey,
            shop_cipher: shopCipher,
            shop_id: '',
            version: VERSION_ORDERS,
            page_size: 100
        };

        if (nextPageToken) {
            queryParams.page_token = nextPageToken;
        }

        const sortedKeys = Object.keys(queryParams).sort();
        const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(queryParams[k])}`).join('&');
        const urlForSignature = `${BASE_URL_SHOP}${ENDPOINT_ORDERS}?${queryString}`;

        const requestBody = {
            create_time_ge: startTime,
            create_time_lt: endTime
        };

        const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);
        const finalQueryParams: any = {
            ...queryParams,
            sign: signatureResult.signature,
            timestamp: signatureResult.timestamp
        };

        const finalQueryString = Object.keys(finalQueryParams).sort()
            .map(k => `${k}=${encodeURIComponent(finalQueryParams[k])}`)
            .join('&');
        const finalUrl = `${BASE_URL_SHOP}${ENDPOINT_ORDERS}?${finalQueryString}`;

        try {
            const response = await axios.post(finalUrl, requestBody, {
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data.code !== 0) {
                console.error(`[Shop ${shopNumber}] TikTok API Error: ${response.data.message}`);
                break;
            }

            const orders = response.data.data?.orders || [];
            totalFetched += orders.length;

            if (orders.length > 0) {
                const upsertedCount = await batchUpsertOrders(orders, shopNumber);
                totalUpserted += upsertedCount;
            }

            nextPageToken = response.data.data?.next_page_token || '';
            hasMore = !!nextPageToken;

            if (hasMore) {
                await sleep(50);
            }
        } catch (err: any) {
            console.error(`[Shop ${shopNumber}] Error:`, err.message);
            break;
        }
    }

    return { fetched: totalFetched, upserted: totalUpserted };
}

function generateChunks(startDateStr: string, endDateStr: string): Array<{ start: Date; end: Date; startStr: string; endStr: string }> {
    const chunks: Array<{ start: Date; end: Date; startStr: string; endStr: string }> = [];
    const current = new Date(`${startDateStr}T00:00:00+08:00`);
    const finalEnd = new Date(`${endDateStr}T23:59:59+08:00`);

    while (current < finalEnd) {
        const chunkEnd = new Date(current);
        chunkEnd.setDate(chunkEnd.getDate() + 30);
        const actualEnd = chunkEnd > finalEnd ? finalEnd : chunkEnd;

        chunks.push({
            start: new Date(current),
            end: new Date(actualEnd),
            startStr: current.toISOString().split('T')[0],
            endStr: actualEnd.toISOString().split('T')[0]
        });

        current.setDate(current.getDate() + 30);
    }

    return chunks;
}

export async function runBackfill(options?: { shopNumbers?: number[]; startDateStr?: string; endDateStr?: string }) {
    const shopNumbers = options?.shopNumbers || [1, 2, 3, 4];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const pastDate = new Date(now);
    pastDate.setMonth(pastDate.getMonth() - 12);
    const defaultStartStr = pastDate.toISOString().split('T')[0];

    const startDateStr = options?.startDateStr || defaultStartStr;
    const endDateStr = options?.endDateStr || todayStr;

    console.log(`=======================================================`);
    console.log(`📦 TIKTOK ORDER BATCH BACKFILL (WITH BUYER USER ID)`);
    console.log(`Shops: ${shopNumbers.join(', ')}`);
    console.log(`Range: ${startDateStr} to ${endDateStr}`);
    console.log(`=======================================================\n`);

    const chunks = generateChunks(startDateStr, endDateStr);
    console.log(`Total 30-day window chunks: ${chunks.length}\n`);

    for (const shopNumber of shopNumbers) {
        console.log(`-------------------------------------------------------`);
        console.log(`🚀 Processing Shop ${shopNumber}...`);
        console.log(`-------------------------------------------------------`);

        let shopTotalOrders = 0;
        let shopTotalUpserted = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const startTime = Math.floor(chunk.start.getTime() / 1000);
            const endTime = Math.floor(chunk.end.getTime() / 1000);

            process.stdout.write(`  [Chunk ${i + 1}/${chunks.length}] ${chunk.startStr} -> ${chunk.endStr}... `);
            const res = await fetchAndSaveOrders(shopNumber, startTime, endTime);
            shopTotalOrders += res.fetched;
            shopTotalUpserted += res.upserted;
            console.log(`Fetched: ${res.fetched}, Upserted: ${res.upserted}`);

            await sleep(100);
        }

        console.log(`\n✅ Shop ${shopNumber} Finished: ${shopTotalOrders} fetched, ${shopTotalUpserted} upserted.\n`);
    }

    console.log(`=======================================================`);
    console.log(`🎉 BACKFILL COMPLETE!`);
    console.log(`=======================================================\n`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    let shops = [1, 2, 3, 4];
    let start = '';
    let end = '';

    for (const arg of args) {
        if (arg.startsWith('--shop=')) {
            const s = parseInt(arg.replace('--shop=', '').trim(), 10);
            if (!isNaN(s)) shops = [s];
        } else if (arg.startsWith('--start=')) {
            start = arg.replace('--start=', '').trim();
        } else if (arg.startsWith('--end=')) {
            end = arg.replace('--end=', '').trim();
        }
    }

    runBackfill({
        shopNumbers: shops,
        startDateStr: start || undefined,
        endDateStr: end || undefined
    })
        .catch(console.error)
        .finally(() => pool.end());
}
