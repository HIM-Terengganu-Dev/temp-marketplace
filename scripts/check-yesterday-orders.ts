import { getShopCredentials } from '../src/lib/tiktok-shop-credentials';
import axios from 'axios';
// @ts-ignore
import tiktokShop from 'tiktok-shop';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL_SHOP = 'https://open-api.tiktokglobalshop.com';
const ENDPOINT_ORDERS = '/order/202309/orders/search';
const VERSION_ORDERS = '202309';

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const parseDateGMT8 = (dateStr: string, hour: number, minute: number, second: number, millisecond: number): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+08:00`;
    return new Date(isoString);
};

async function run() {
    let grandTotalIkram = 0;
    let grandTotalNormal = 0;

    for (let shopNumber = 1; shopNumber <= 4; shopNumber++) {
        const shopCredentials = await getShopCredentials(shopNumber);
        if (!shopCredentials) {
            console.log(`\n======================================\nNo credentials found for shop ${shopNumber}\n======================================\n`);
            continue;
        }

        const appKey = cleanEnv(process.env.TIKTOK_SHOP_APP_KEY);
        const appSecret = cleanEnv(process.env.TIKTOK_SHOP_APP_SECRET);
        const accessToken = shopCredentials.access_token;
        const shopCipher = shopCredentials.shop_cipher;

        const startDateStr = '2026-05-25';
        const endDateStr = '2026-05-25';

        const start = parseDateGMT8(startDateStr, 0, 0, 0, 0);
        const end = parseDateGMT8(endDateStr, 23, 59, 59, 999);
        const startTime = Math.floor(start.getTime() / 1000);
        const endTime = Math.floor(end.getTime() / 1000);

        const queryParams: any = {
            access_token: accessToken,
            app_key: appKey,
            shop_cipher: shopCipher,
            shop_id: '',
            version: VERSION_ORDERS,
            page_size: 50
        };

        const sortedKeys = Object.keys(queryParams).sort();
        const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
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

        const finalSortedKeys = Object.keys(finalQueryParams).sort();
        const finalQueryString = finalSortedKeys.map(key => `${key}=${encodeURIComponent(finalQueryParams[key])}`).join('&');
        const finalUrl = `${BASE_URL_SHOP}${ENDPOINT_ORDERS}?${finalQueryString}`;

        try {
            console.log(`\nQuerying Shop ${shopNumber} (${shopCredentials.shop_name}) for ${startDateStr}...`);
            const response = await axios.post(finalUrl, requestBody, {
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 0) {
                console.error(`API Error for shop ${shopNumber}:`, response.data);
                continue;
            }

            const orders = response.data.data?.orders || [];
            console.log(`Fetched ${orders.length} orders. API Response Data keys:`, Object.keys(response.data.data || {}));
            console.log(`API Response nextPageToken: "${response.data.data?.next_page_token || ''}"`);
            console.log(`API Response has_more: ${response.data.data?.has_more}`);
            console.log(`API Response total: ${response.data.data?.total}`);
            let totalGmvIkram = 0;
            let totalGmvNormal = 0;
            let cancelledCount = 0;
            let refundedCount = 0;

            orders.forEach((order: any) => {
                let salePriceSum = 0;
                let platformDiscountSum = 0;

                order.line_items?.forEach((item: any) => {
                    salePriceSum += parseFloat(item.sale_price || '0');
                    platformDiscountSum += parseFloat(item.platform_discount || '0');
                });

                const status = order.status || 'UNKNOWN';
                const isCancelledOrRefunded = status === 'CANCELLED' || status === 'REFUNDED';
                if (status === 'CANCELLED') cancelledCount++;
                if (status === 'REFUNDED') refundedCount++;

                const orderGmvIkram = salePriceSum;
                const orderGmvNormal = salePriceSum + platformDiscountSum;

                totalGmvIkram += orderGmvIkram;
                if (!isCancelledOrRefunded) {
                    totalGmvNormal += orderGmvNormal;
                }
            });

            console.log(`Shop ${shopNumber} Summary:`);
            console.log(`  Total Orders: ${orders.length}`);
            console.log(`  Cancelled Orders: ${cancelledCount}`);
            console.log(`  Refunded Orders: ${refundedCount}`);
            console.log(`  Ikram GMV (All statuses, sale_price only): RM ${totalGmvIkram.toFixed(2)}`);
            console.log(`  Normal GMV (Excl cancelled/refunded, sale_price + platform_discount): RM ${totalGmvNormal.toFixed(2)}`);

            grandTotalIkram += totalGmvIkram;
            grandTotalNormal += totalGmvNormal;

        } catch (e: any) {
            console.error(`Request failed for shop ${shopNumber}:`, e.message);
        }
    }

    console.log('\n======================================');
    console.log('GRAND TOTALS ACROSS ALL TikTok SHOPS FOR YESTERDAY:');
    console.log(`  Total Ikram GMV (Used on Ads page): RM ${grandTotalIkram.toFixed(2)}`);
    console.log(`  Total Normal GMV:                   RM ${grandTotalNormal.toFixed(2)}`);
    console.log('======================================\n');
}

run();
