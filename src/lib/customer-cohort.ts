import { query } from './db';

export interface CustomerCohortFilter {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    shopIds?: string[]; // e.g. ['1', '2']
    marketplace?: string; // default 'tiktok'
}

export interface CustomerCohortResult {
    summary: {
        totalCustomers: number;
        newCustomers: number;
        returningCustomers: number;
        returnCustomerRate: number; // percentage
        totalOrders: number;
        newOrders: number;
        returningOrders: number;
        totalGmv: number;
        newGmv: number;
        returningGmv: number;
        newAov: number;
        returningAov: number;
    };
    dailyTrend: Array<{
        date: string;
        newCustomers: number;
        returningCustomers: number;
        totalCustomers: number;
        newGmv: number;
        returningGmv: number;
        totalGmv: number;
        returnRate: number;
    }>;
    byShop: Array<{
        shopId: string;
        marketplace?: string;
        newCustomers: number;
        returningCustomers: number;
        totalCustomers: number;
        newGmv: number;
        returningGmv: number;
        totalGmv: number;
        returnRate: number;
    }>;
}

export async function getCustomerCohortStats(filter: CustomerCohortFilter): Promise<CustomerCohortResult> {
    const { startDate, endDate, shopIds, marketplace: rawMarketplace = 'tiktok' } = filter;
    const marketplace = rawMarketplace === 'combine' ? 'all' : rawMarketplace;

    const startTs = `${startDate} 00:00:00+08:00`;
    const endTs = `${endDate} 23:59:59+08:00`;

    let shopFilterClause = '';
    const params: any[] = [startTs, endTs, marketplace];

    if (shopIds && shopIds.length > 0) {
        params.push(shopIds);
        shopFilterClause = `AND o.shop_id = ANY($${params.length}::varchar[])`;
    }

    // 1. Summary Query
    const summarySql = `
        WITH customer_first_orders AS (
            SELECT 
                buyer_user_id,
                marketplace,
                MIN(created_at) as first_order_date
            FROM credentials.orders
            WHERE buyer_user_id IS NOT NULL
                AND order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR marketplace = $3)
            GROUP BY buyer_user_id, marketplace
        ),
        period_orders AS (
            SELECT 
                o.order_sn,
                o.shop_id,
                o.buyer_user_id,
                o.gmv,
                o.created_at,
                o.marketplace,
                CASE 
                    WHEN o.created_at <= (c.first_order_date + INTERVAL '1 second') THEN 'NEW'
                    ELSE 'RETURNING'
                END AS customer_type
            FROM credentials.orders o
            JOIN customer_first_orders c ON o.buyer_user_id = c.buyer_user_id AND o.marketplace = c.marketplace
            WHERE o.created_at >= $1 
                AND o.created_at <= $2
                AND o.order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR o.marketplace = $3)
                ${shopFilterClause}
        )
        SELECT 
            customer_type,
            COUNT(DISTINCT (buyer_user_id || '_' || marketplace))::int as customer_count,
            COUNT(order_sn)::int as order_count,
            ROUND(COALESCE(SUM(gmv), 0), 2)::float as total_gmv
        FROM period_orders
        GROUP BY customer_type;
    `;

    // 2. Daily Trend Query
    const dailySql = `
        WITH customer_first_orders AS (
            SELECT 
                buyer_user_id,
                marketplace,
                MIN(created_at) as first_order_date
            FROM credentials.orders
            WHERE buyer_user_id IS NOT NULL
                AND order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR marketplace = $3)
            GROUP BY buyer_user_id, marketplace
        ),
        period_orders AS (
            SELECT 
                o.order_sn,
                o.buyer_user_id,
                o.gmv,
                o.marketplace,
                TO_CHAR(o.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD') as day_str,
                CASE 
                    WHEN o.created_at <= (c.first_order_date + INTERVAL '1 second') THEN 'NEW'
                    ELSE 'RETURNING'
                END AS customer_type
            FROM credentials.orders o
            JOIN customer_first_orders c ON o.buyer_user_id = c.buyer_user_id AND o.marketplace = c.marketplace
            WHERE o.created_at >= $1 
                AND o.created_at <= $2
                AND o.order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR o.marketplace = $3)
                ${shopFilterClause}
        )
        SELECT 
            day_str,
            COUNT(DISTINCT CASE WHEN customer_type = 'NEW' THEN (buyer_user_id || '_' || marketplace) END)::int as new_customers,
            COUNT(DISTINCT CASE WHEN customer_type = 'RETURNING' THEN (buyer_user_id || '_' || marketplace) END)::int as returning_customers,
            COUNT(DISTINCT (buyer_user_id || '_' || marketplace))::int as total_customers,
            ROUND(COALESCE(SUM(CASE WHEN customer_type = 'NEW' THEN gmv ELSE 0 END), 0), 2)::float as new_gmv,
            ROUND(COALESCE(SUM(CASE WHEN customer_type = 'RETURNING' THEN gmv ELSE 0 END), 0), 2)::float as returning_gmv,
            ROUND(COALESCE(SUM(gmv), 0), 2)::float as total_gmv
        FROM period_orders
        GROUP BY day_str
        ORDER BY day_str ASC;
    `;

    // 3. Breakdown By Shop Query
    const shopSql = `
        WITH customer_first_orders AS (
            SELECT 
                buyer_user_id,
                marketplace,
                MIN(created_at) as first_order_date
            FROM credentials.orders
            WHERE buyer_user_id IS NOT NULL
                AND order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR marketplace = $3)
            GROUP BY buyer_user_id, marketplace
        ),
        period_orders AS (
            SELECT 
                o.order_sn,
                o.shop_id,
                o.buyer_user_id,
                o.gmv,
                o.marketplace,
                CASE 
                    WHEN o.created_at <= (c.first_order_date + INTERVAL '1 second') THEN 'NEW'
                    ELSE 'RETURNING'
                END AS customer_type
            FROM credentials.orders o
            JOIN customer_first_orders c ON o.buyer_user_id = c.buyer_user_id AND o.marketplace = c.marketplace
            WHERE o.created_at >= $1 
                AND o.created_at <= $2
                AND o.order_status NOT IN ('CANCELLED', 'REFUNDED', 'TO_RETURN', 'UNPAID')
                AND ($3 = 'all' OR o.marketplace = $3)
                ${shopFilterClause}
        )
        SELECT 
            shop_id,
            marketplace,
            COUNT(DISTINCT CASE WHEN customer_type = 'NEW' THEN (buyer_user_id || '_' || marketplace) END)::int as new_customers,
            COUNT(DISTINCT CASE WHEN customer_type = 'RETURNING' THEN (buyer_user_id || '_' || marketplace) END)::int as returning_customers,
            COUNT(DISTINCT (buyer_user_id || '_' || marketplace))::int as total_customers,
            ROUND(COALESCE(SUM(CASE WHEN customer_type = 'NEW' THEN gmv ELSE 0 END), 0), 2)::float as new_gmv,
            ROUND(COALESCE(SUM(CASE WHEN customer_type = 'RETURNING' THEN gmv ELSE 0 END), 0), 2)::float as returning_gmv,
            ROUND(COALESCE(SUM(gmv), 0), 2)::float as total_gmv
        FROM period_orders
        GROUP BY shop_id, marketplace
        ORDER BY shop_id ASC;
    `;


    const [summaryRes, dailyRes, shopRes] = await Promise.all([
        query(summarySql, params),
        query(dailySql, params),
        query(shopSql, params)
    ]);

    let newCustomers = 0;
    let returningCustomers = 0;
    let newOrders = 0;
    let returningOrders = 0;
    let newGmv = 0;
    let returningGmv = 0;

    summaryRes.rows.forEach(r => {
        if (r.customer_type === 'NEW') {
            newCustomers = r.customer_count || 0;
            newOrders = r.order_count || 0;
            newGmv = r.total_gmv || 0;
        } else if (r.customer_type === 'RETURNING') {
            returningCustomers = r.customer_count || 0;
            returningOrders = r.order_count || 0;
            returningGmv = r.total_gmv || 0;
        }
    });

    const totalCustomers = newCustomers + returningCustomers;
    const totalOrders = newOrders + returningOrders;
    const totalGmv = Number((newGmv + returningGmv).toFixed(2));
    const returnCustomerRate = totalCustomers > 0 ? Number(((returningCustomers / totalCustomers) * 100).toFixed(2)) : 0;
    const newAov = newOrders > 0 ? Number((newGmv / newOrders).toFixed(2)) : 0;
    const returningAov = returningOrders > 0 ? Number((returningGmv / returningOrders).toFixed(2)) : 0;

    const dailyTrend = dailyRes.rows.map(r => ({
        date: r.day_str,
        newCustomers: r.new_customers || 0,
        returningCustomers: r.returning_customers || 0,
        totalCustomers: r.total_customers || 0,
        newGmv: r.new_gmv || 0,
        returningGmv: r.returning_gmv || 0,
        totalGmv: r.total_gmv || 0,
        returnRate: (r.total_customers > 0) ? Number(((r.returning_customers / r.total_customers) * 100).toFixed(2)) : 0
    }));

    const byShop = shopRes.rows.map(r => ({
        shopId: r.shop_id,
        marketplace: r.marketplace,
        newCustomers: r.new_customers || 0,
        returningCustomers: r.returning_customers || 0,
        totalCustomers: r.total_customers || 0,
        newGmv: r.new_gmv || 0,
        returningGmv: r.returning_gmv || 0,
        totalGmv: r.total_gmv || 0,
        returnRate: (r.total_customers > 0) ? Number(((r.returning_customers / r.total_customers) * 100).toFixed(2)) : 0
    }));


    return {
        summary: {
            totalCustomers,
            newCustomers,
            returningCustomers,
            returnCustomerRate,
            totalOrders,
            newOrders,
            returningOrders,
            totalGmv,
            newGmv,
            returningGmv,
            newAov,
            returningAov
        },
        dailyTrend,
        byShop
    };
}
