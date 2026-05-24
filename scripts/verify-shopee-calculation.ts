import { getValidShopeeToken, fetchShopeeGMVAndOrders } from '../src/lib/shopee-client';
import { query } from '../src/lib/db';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Helper to match parseDateGMT8 in shopee-client
function parseDateGMT8(dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
    return new Date(isoString);
}

async function main() {
    const targetDate = process.argv[2] || '2026-05-23';
    console.log(`Starting Shopee Sales Calculation verification for date: ${targetDate}...\n`);


    // Fetch all connected Shopee shops
    const result = await query(`
        SELECT shop_id, shop_name FROM credentials.refresh_shopeeshops_token ORDER BY shop_name
    `);

    for (const row of result.rows) {
        const shopId = row.shop_id;
        const shopName = row.shop_name;
        console.log(`\n================================================================`);
        console.log(`🛒 Shopee Shop: ${shopName} (ID: ${shopId})`);
        console.log(`================================================================`);

        try {
            const token = await getValidShopeeToken(shopId);
            const start = parseDateGMT8(targetDate, 0, 0, 0, 0);
            const end = parseDateGMT8(targetDate, 23, 59, 59, 999);
            const timeFrom = Math.floor(start.getTime() / 1000);
            const timeTo = Math.floor(end.getTime() / 1000);

            // Fetch order list
            const allOrderSns: string[] = [];
            let hasMore = true;
            let cursor = "";

            while (hasMore) {
                const timestamp = Math.floor(Date.now() / 1000);
                const path = '/api/v2/order/get_order_list';
                const { generateShopeeSignature } = require('../src/lib/shopee-client');
                const sign = generateShopeeSignature(path, timestamp, token, shopId);
                let url = `https://partner.shopeemobile.com${path}?partner_id=${process.env.SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopId}`;
                url += `&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=50`;
                if (cursor) {
                    url += `&cursor=${encodeURIComponent(cursor)}`;
                }

                const response = await axios.get(url);
                const data = response.data;
                if (data.error) throw new Error(data.message || data.error);

                const resp = data.response;
                if (resp && resp.order_list) {
                    resp.order_list.forEach((o: any) => {
                        if (o.order_sn) allOrderSns.push(o.order_sn);
                    });
                    hasMore = !!resp.more;
                    cursor = resp.next_cursor || "";
                } else {
                    hasMore = false;
                }
            }

            console.log(`Found ${allOrderSns.length} total orders created on ${targetDate}.`);
            if (allOrderSns.length === 0) continue;

            // Fetch details in batch chunked by 50
            const chunkedOrderSns: string[][] = [];
            for (let i = 0; i < allOrderSns.length; i += 50) {
                chunkedOrderSns.push(allOrderSns.slice(i, i + 50));
            }

            const orders: any[] = [];
            for (const chunk of chunkedOrderSns) {
                const timestamp = Math.floor(Date.now() / 1000);
                const path = '/api/v2/order/get_order_detail';
                const { generateShopeeSignature } = require('../src/lib/shopee-client');
                const sign = generateShopeeSignature(path, timestamp, token, shopId);
                const optionalFields = 'buyer_user_id,total_amount,item_list,order_status';
                const url = `https://partner.shopeemobile.com${path}?partner_id=${process.env.SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&access_token=${token}&shop_id=${shopId}&order_sn_list=${encodeURIComponent(chunk.join(','))}&response_optional_fields=${encodeURIComponent(optionalFields)}`;

                const response = await axios.get(url);
                const data = response.data;
                if (data.error) throw new Error(data.message || data.error);
                
                if (data.response?.order_list) {
                    orders.push(...data.response.order_list);
                }
            }


            console.log(`\nOrder-by-Order Breakdown:`);
            console.log(`%-22s | %-12s | %-12s | %-12s | %-15s`.replace(/%/g, ''));
            console.log(`Order SN               | Status       | Total Amount | Item Price   | Buyer ID`);
            console.log(`-----------------------|--------------|--------------|--------------|----------------`);

            let sumTotalAmountAll = 0;
            let sumItemPriceAll = 0;
            
            let sumTotalAmountExcludingCancelled = 0;
            let sumItemPriceExcludingCancelled = 0;

            let sumItemPriceExcludingUnpaidAndCancelled = 0; // paid & not cancelled

            for (const order of orders) {
                const status = order.order_status?.toUpperCase();
                const totalAmt = parseFloat(order.total_amount || 0);

                let itemPriceSum = 0;
                if (order.item_list) {
                    order.item_list.forEach((item: any) => {
                        const price = item.model_discounted_price !== undefined ? item.model_discounted_price : (item.model_original_price || 0);
                        itemPriceSum += parseFloat(price) * (item.model_quantity_purchased || 1);
                    });
                }

                console.log(`${order.order_sn.padEnd(22)} | ${status.padEnd(12)} | RM ${totalAmt.toFixed(2).padStart(8)} | RM ${itemPriceSum.toFixed(2).padStart(8)} | ${order.buyer_user_id}`);

                sumTotalAmountAll += totalAmt;
                sumItemPriceAll += itemPriceSum;

                if (status !== 'CANCELLED') {
                    sumTotalAmountExcludingCancelled += totalAmt;
                    sumItemPriceExcludingCancelled += itemPriceSum;
                }

                if (status !== 'CANCELLED' && status !== 'UNPAID') {
                    sumItemPriceExcludingUnpaidAndCancelled += itemPriceSum;
                }
            }

            console.log(`\nCalculation Summaries for ${shopName}:`);
            console.log(`1. Sum of Total Amount (Buyer Paid) - ALL:                    RM ${sumTotalAmountAll.toFixed(2)}`);
            console.log(`2. Sum of Item Deal Price - ALL:                              RM ${sumItemPriceAll.toFixed(2)}`);
            console.log(`3. Sum of Total Amount - EXCLUDING CANCELLED:                 RM ${sumTotalAmountExcludingCancelled.toFixed(2)}`);
            console.log(`4. Sum of Item Deal Price - EXCLUDING CANCELLED:              RM ${sumItemPriceExcludingCancelled.toFixed(2)}`);
            console.log(`5. Sum of Item Deal Price - EXCLUDING UNPAID & CANCELLED:     RM ${sumItemPriceExcludingUnpaidAndCancelled.toFixed(2)}`);

        } catch (e: any) {
            console.error(`❌ Error verifying shop ${shopId}:`, e.message || e);
        }
    }
    process.exit(0);
}

main();
