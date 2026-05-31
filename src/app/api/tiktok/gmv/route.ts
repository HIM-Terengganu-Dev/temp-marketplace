import { NextResponse } from 'next/server';
import { fetchShopGMV } from '@/lib/metrics-fetcher';
import { query } from '@/lib/db';

function getKLToday(): string {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); 
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    try {
        const today = getKLToday();
        const isToday = startDate === today || endDate === today;

        // Try DB cache first for non-today requests
        if (!isToday) {
            try {
                const dbResult = await query(`
                    SELECT SUM(gmv) as gmv, SUM(order_count) as order_count, MAX(shop_name) as shop_name
                    FROM credentials.daily_shop_metrics
                    WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
                `, [shopNumber, startDate, endDate]);

                if (dbResult.rows.length > 0 && dbResult.rows[0].gmv !== null) {
                    const dbGmv = parseFloat(dbResult.rows[0].gmv);
                    const dbOrders = parseInt(dbResult.rows[0].order_count || '0', 10);
                    const shopName = dbResult.rows[0].shop_name || `Shop ${shopNumber}`;
                    
                    if (dbGmv > 0 || dbOrders > 0) {
                        return NextResponse.json({
                            shopName,
                            gmv: dbGmv,
                            cogs: dbGmv * 0.28,
                            orderCount: dbOrders,
                            totalOrderCount: dbOrders,
                            uniqueCustomers: dbOrders,
                            orders: [],
                            currency: 'RM',
                            dateRange: { start: startDate, end: endDate },
                            dataSource: 'database_cache'
                        });
                    }
                }
            } catch (dbErr) {
                console.warn('DB Cache lookup failed in tiktok/gmv route:', dbErr);
            }
        }

        // Live fetch fallback
        let result;
        try {
            result = await fetchShopGMV(shopNumber, startDate, endDate);
        } catch (apiErr: any) {
            console.warn(`TikTok live gmv fetch failed for shop ${shopNumber}:`, apiErr.message);
            // Attempt DB recovery fallback
            const dbResult = await query(`
                SELECT SUM(gmv) as gmv, SUM(order_count) as order_count, MAX(shop_name) as shop_name
                FROM credentials.daily_shop_metrics
                WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
            `, [shopNumber, startDate, endDate]);

            if (dbResult.rows.length > 0 && dbResult.rows[0].gmv !== null) {
                const dbGmv = parseFloat(dbResult.rows[0].gmv);
                const dbOrders = parseInt(dbResult.rows[0].order_count || '0', 10);
                const shopName = dbResult.rows[0].shop_name || `Shop ${shopNumber}`;
                return NextResponse.json({
                    shopName,
                    gmv: dbGmv,
                    cogs: dbGmv * 0.28,
                    orderCount: dbOrders,
                    totalOrderCount: dbOrders,
                    uniqueCustomers: dbOrders,
                    orders: [],
                    currency: 'RM',
                    dateRange: { start: startDate, end: endDate },
                    dataSource: 'database_recovery'
                });
            }
            throw apiErr;
        }

        // If live API returned 0 but DB has non-zero, fall back to DB to prevent 0-metric display bug
        if (result.gmv === 0) {
            const dbResult = await query(`
                SELECT SUM(gmv) as gmv, SUM(order_count) as order_count, MAX(shop_name) as shop_name
                FROM credentials.daily_shop_metrics
                WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
            `, [shopNumber, startDate, endDate]);

            if (dbResult.rows.length > 0 && dbResult.rows[0].gmv !== null && parseFloat(dbResult.rows[0].gmv) > 0) {
                const dbGmv = parseFloat(dbResult.rows[0].gmv);
                const dbOrders = parseInt(dbResult.rows[0].order_count || '0', 10);
                return NextResponse.json({
                    shopName: result.shopName || dbResult.rows[0].shop_name,
                    gmv: dbGmv,
                    cogs: dbGmv * 0.28,
                    orderCount: dbOrders,
                    totalOrderCount: dbOrders,
                    uniqueCustomers: dbOrders,
                    orders: [],
                    currency: 'RM',
                    dateRange: { start: startDate, end: endDate },
                    dataSource: 'database_recovery_zero'
                });
            }
        }

        return NextResponse.json({
            ...result,
            currency: 'RM',
            dateRange: { start: startDate, end: endDate },
            dataSource: 'live_api'
        });
    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
