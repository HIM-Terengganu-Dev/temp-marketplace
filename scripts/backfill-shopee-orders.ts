import { query, pool } from '../src/lib/db';
import {
    getConnectedShopeeShops,
    getValidShopeeToken,
    generateShopeeSignature,
    shopeeApiGet,
} from '../src/lib/shopee-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10);
const API_BASE_URL = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeemobile.com';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function batchUpsertShopeeOrders(orders: any[], shopId: string | number) {
    if (!orders || orders.length === 0) return 0;

    const BATCH_SIZE = 100;
    let totalSaved = 0;

    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, i + BATCH_SIZE);
        const values: any[] = [];
        const valueClauses: string[] = [];

        batch.forEach((o, index) => {
            const offset = index * 9;
            const buyerUserId = o.buyer_user_id ? String(o.buyer_user_id) : null;

            let productSubtotal = 0;
            if (o.item_list && Array.isArray(o.item_list)) {
                o.item_list.forEach((item: any) => {
                    const priceVal =
                        item.model_discounted_price !== undefined
                            ? item.model_discounted_price
                            : item.model_original_price !== undefined
                            ? item.model_original_price
                            : 0;
                    productSubtotal += parseFloat(priceVal || 0) * (item.model_quantity_purchased || 1);
                });
            } else if (o.total_amount) {
                productSubtotal = parseFloat(o.total_amount || 0);
            }

            const createdAt = o.create_time ? new Date(o.create_time * 1000) : new Date();
            const updatedAt = o.update_time ? new Date(o.update_time * 1000) : new Date();
            const cancelledAt =
                o.order_status === 'CANCELLED' || o.order_status === 'TO_RETURN'
                    ? updatedAt
                    : null;

            valueClauses.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            );

            values.push(
                o.order_sn,
                String(shopId),
                'shopee',
                parseFloat(productSubtotal.toFixed(2)),
                o.order_status || 'UNKNOWN',
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
        totalSaved += batch.length;
    }

    return totalSaved;
}

export async function fetchAndSaveShopeeOrdersForRange(
    shopIdNum: number,
    token: string,
    timeFrom: number,
    timeTo: number
): Promise<{ fetched: number; upserted: number }> {
    const allOrderSns: string[] = [];
    let hasMore = true;
    let cursor = '';

    while (hasMore) {
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/api/v2/order/get_order_list';
        const sign = generateShopeeSignature(path, timestamp, token, shopIdNum);

        let url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopIdNum}`;
        url += `&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=50`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        try {
            const response = await shopeeApiGet(url);
            const data = response.data;
            if (data?.response?.order_list) {
                for (const o of data.response.order_list) {
                    if (o.order_sn) allOrderSns.push(o.order_sn);
                }
                hasMore = !!data.response.more;
                cursor = data.response.next_cursor || '';
            } else {
                hasMore = false;
            }
        } catch (err: any) {
            console.error(`[Shop ${shopIdNum}] Error get_order_list:`, err.message);
            hasMore = false;
        }

        if (hasMore) await sleep(100);
    }

    if (allOrderSns.length === 0) {
        return { fetched: 0, upserted: 0 };
    }

    // Detail batches of 50
    let totalUpserted = 0;
    const chunkedSns: string[][] = [];
    for (let i = 0; i < allOrderSns.length; i += 50) {
        chunkedSns.push(allOrderSns.slice(i, i + 50));
    }

    for (const chunk of chunkedSns) {
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/api/v2/order/get_order_detail';
        const sign = generateShopeeSignature(path, timestamp, token, shopIdNum);

        const orderSnListStr = chunk.join(',');
        const optionalFields = 'buyer_user_id,total_amount,item_list,order_status';

        let url = `${API_BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopIdNum}`;
        url += `&order_sn_list=${encodeURIComponent(orderSnListStr)}&response_optional_fields=${encodeURIComponent(optionalFields)}`;

        try {
            const response = await shopeeApiGet(url);
            const data = response.data;
            if (data?.response?.order_list) {
                const count = await batchUpsertShopeeOrders(data.response.order_list, shopIdNum);
                totalUpserted += count;
            }
        } catch (err: any) {
            console.error(`[Shop ${shopIdNum}] Error get_order_detail:`, err.message);
        }

        await sleep(100);
    }

    return { fetched: allOrderSns.length, upserted: totalUpserted };
}

function generate15DayChunks(startDate: string, endDate: string) {
    const chunks: { fromDate: string; toDate: string; timeFrom: number; timeTo: number }[] = [];
    let current = new Date(`${startDate}T00:00:00+08:00`);
    const end = new Date(`${endDate}T23:59:59+08:00`);

    while (current < end) {
        let chunkEnd = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000);
        if (chunkEnd > end) {
            chunkEnd = end;
        }

        const fromDateStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const toDateStr = chunkEnd.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

        chunks.push({
            fromDate: fromDateStr,
            toDate: toDateStr,
            timeFrom: Math.floor(current.getTime() / 1000),
            timeTo: Math.floor(chunkEnd.getTime() / 1000),
        });

        // Next chunk starts after chunkEnd
        current = new Date(chunkEnd.getTime() + 1000);
    }

    return chunks;
}

async function runBackfill() {
    console.log('=== SHOPEE ORDERS BACKFILL PIPELINE ===\n');

    const connectedShops = await getConnectedShopeeShops();
    console.log(`Found ${connectedShops.length} connected Shopee shops in database:`);
    connectedShops.forEach((s) => console.log(`  - Shop ID: ${s.shop_id} (${s.shop_name || 'unnamed'})`));

    // Date range: 2025-01-01 to Today
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const startDateStr = '2025-01-01';

    const chunks = generate15DayChunks(startDateStr, todayStr);
    console.log(`\nGenerated ${chunks.length} 15-day chunks from ${startDateStr} to ${todayStr}.`);

    let grandTotalOrders = 0;

    for (const shop of connectedShops) {
        const shopIdNum = parseInt(shop.shop_id, 10);
        console.log(`\n========================================`);
        console.log(`Starting Shop: ${shop.shop_name} (ID: ${shop.shop_id})`);
        console.log(`========================================`);

        let token = '';
        try {
            token = await getValidShopeeToken(shopIdNum);
        } catch (e: any) {
            console.error(`Failed to get access token for shop ${shop.shop_id}:`, e.message);
            continue;
        }

        let shopOrders = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            process.stdout.write(`  [${i + 1}/${chunks.length}] ${chunk.fromDate} → ${chunk.toDate}: `);

            try {
                const res = await fetchAndSaveShopeeOrdersForRange(
                    shopIdNum,
                    token,
                    chunk.timeFrom,
                    chunk.timeTo
                );
                shopOrders += res.upserted;
                grandTotalOrders += res.upserted;
                console.log(`+${res.upserted} orders (total: ${shopOrders})`);
            } catch (err: any) {
                console.log(`FAILED (${err.message})`);
            }

            await sleep(150);
        }

        console.log(`\nCompleted Shop ${shop.shop_name}: ${shopOrders} orders synced.`);
    }

    console.log(`\n=== BACKFILL COMPLETE ===`);
    console.log(`Total Shopee orders upserted: ${grandTotalOrders}`);

    const verify = await query(`
        SELECT 
            marketplace,
            COUNT(*) as total_orders,
            COUNT(buyer_user_id) as with_buyer,
            ROUND(COUNT(buyer_user_id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as buyer_id_pct
        FROM credentials.orders
        GROUP BY marketplace;
    `);
    console.log('\nFinal DB orders count:');
    console.table(verify.rows);

    await pool.end();
}

if (require.main === module) {
    runBackfill().catch((err) => {
        console.error('Fatal backfill error:', err);
        process.exit(1);
    });
}
