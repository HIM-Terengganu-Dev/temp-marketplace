import { Pool } from 'pg';
import dotenv from 'dotenv';
import { pool as localPool } from '@/lib/db';
import {
    CampaignEvent,
    CustomCostItem,
    EventPlatform,
    EventDepartment,
    EventAnalysisMetrics,
    WinningSkuItem,
} from '@/types/events';

if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

function createPool(connStr?: string) {
    if (!connStr) return null;
    return new Pool({
        connectionString: connStr,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false },
    });
}

const mktPool = createPool(process.env.DB_MARKETING_URL);
const livePool = createPool(process.env.DB_LIVEHOST_URL);
const affPool = createPool(process.env.DB_AFFILIATE_URL);
const stockPool = createPool(process.env.DB_STOCK_URL);

/**
 * Ensure the table exists in Neon
 */
export async function ensureEventsTable(): Promise<void> {
    await localPool.query(`
        CREATE TABLE IF NOT EXISTS credentials.campaign_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            target_amount NUMERIC(15, 2) DEFAULT 0,
            platform VARCHAR(50) DEFAULT 'combine',
            departments JSONB DEFAULT '["marketing", "livehost", "affiliate", "orders"]'::jsonb,
            custom_costs JSONB DEFAULT '[]'::jsonb,
            notes TEXT,
            platform_cost_rate NUMERIC(5, 2) DEFAULT 25.0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE credentials.campaign_events 
        ADD COLUMN IF NOT EXISTS platform_cost_rate NUMERIC(5, 2) DEFAULT 25.0;
    `);
}

/**
 * Fetch all campaign events
 */
export async function getAllEvents(): Promise<CampaignEvent[]> {
    await ensureEventsTable();
    const res = await localPool.query(`
        SELECT 
            id,
            name,
            start_date::text as "startDate",
            end_date::text as "endDate",
            target_amount::float as "targetAmount",
            platform,
            departments,
            custom_costs as "customCosts",
            notes,
            platform_cost_rate::float as "platformCostRate",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM credentials.campaign_events
        ORDER BY start_date DESC, created_at DESC;
    `);

    return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        targetAmount: parseFloat(row.targetAmount || 0),
        platform: row.platform as EventPlatform,
        departments: (Array.isArray(row.departments) ? row.departments : []) as EventDepartment[],
        customCosts: (Array.isArray(row.customCosts) ? row.customCosts : []) as CustomCostItem[],
        notes: row.notes || '',
        platformCostRate: row.platformCostRate !== null && row.platformCostRate !== undefined ? parseFloat(row.platformCostRate) : 25,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    }));
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(id: string): Promise<CampaignEvent | null> {
    await ensureEventsTable();
    const res = await localPool.query(
        `
        SELECT 
            id,
            name,
            start_date::text as "startDate",
            end_date::text as "endDate",
            target_amount::float as "targetAmount",
            platform,
            departments,
            custom_costs as "customCosts",
            notes,
            platform_cost_rate::float as "platformCostRate",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM credentials.campaign_events
        WHERE id = $1;
    `,
        [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        targetAmount: parseFloat(row.targetAmount || 0),
        platform: row.platform as EventPlatform,
        departments: (Array.isArray(row.departments) ? row.departments : []) as EventDepartment[],
        customCosts: (Array.isArray(row.customCosts) ? row.customCosts : []) as CustomCostItem[],
        notes: row.notes || '',
        platformCostRate: row.platformCostRate !== null && row.platformCostRate !== undefined ? parseFloat(row.platformCostRate) : 25,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    };
}

/**
 * Create a new event
 */
export async function createEvent(data: {
    name: string;
    startDate: string;
    endDate: string;
    targetAmount?: number;
    platform?: EventPlatform;
    departments?: EventDepartment[];
    customCosts?: CustomCostItem[];
    notes?: string;
    platformCostRate?: number;
}): Promise<CampaignEvent> {
    await ensureEventsTable();
    const targetAmount = data.targetAmount || 0;
    const platform = data.platform || 'combine';
    const departments = data.departments || ['marketing', 'livehost', 'affiliate', 'orders'];
    const customCosts = data.customCosts || [];
    const notes = data.notes || '';
    const platformCostRate = data.platformCostRate !== undefined ? data.platformCostRate : 25;

    const res = await localPool.query(
        `
        INSERT INTO credentials.campaign_events (
            name, 
            start_date, 
            end_date, 
            target_amount, 
            platform, 
            departments, 
            custom_costs, 
            notes,
            platform_cost_rate
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
        RETURNING 
            id,
            name,
            start_date::text as "startDate",
            end_date::text as "endDate",
            target_amount::float as "targetAmount",
            platform,
            departments,
            custom_costs as "customCosts",
            notes,
            platform_cost_rate::float as "platformCostRate",
            created_at as "createdAt",
            updated_at as "updatedAt";
    `,
        [
            data.name,
            data.startDate,
            data.endDate,
            targetAmount,
            platform,
            JSON.stringify(departments),
            JSON.stringify(customCosts),
            notes,
            platformCostRate,
        ]
    );

    const row = res.rows[0];
    return {
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        targetAmount: parseFloat(row.targetAmount || 0),
        platform: row.platform as EventPlatform,
        departments: row.departments as EventDepartment[],
        customCosts: row.customCosts as CustomCostItem[],
        notes: row.notes,
        platformCostRate: row.platformCostRate !== null && row.platformCostRate !== undefined ? parseFloat(row.platformCostRate) : 25,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    };
}

/**
 * Update an existing event
 */
export async function updateEvent(
    id: string,
    data: {
        name?: string;
        startDate?: string;
        endDate?: string;
        targetAmount?: number;
        platform?: EventPlatform;
        departments?: EventDepartment[];
        customCosts?: CustomCostItem[];
        notes?: string;
        platformCostRate?: number;
    }
): Promise<CampaignEvent | null> {
    await ensureEventsTable();
    const current = await getEventById(id);
    if (!current) return null;

    const name = data.name !== undefined ? data.name : current.name;
    const startDate = data.startDate !== undefined ? data.startDate : current.startDate;
    const endDate = data.endDate !== undefined ? data.endDate : current.endDate;
    const targetAmount = data.targetAmount !== undefined ? data.targetAmount : current.targetAmount;
    const platform = data.platform !== undefined ? data.platform : current.platform;
    const departments = data.departments !== undefined ? data.departments : current.departments;
    const customCosts = data.customCosts !== undefined ? data.customCosts : current.customCosts;
    const notes = data.notes !== undefined ? data.notes : current.notes;
    const platformCostRate = data.platformCostRate !== undefined ? data.platformCostRate : (current.platformCostRate ?? 25);

    const res = await localPool.query(
        `
        UPDATE credentials.campaign_events
        SET 
            name = $1,
            start_date = $2,
            end_date = $3,
            target_amount = $4,
            platform = $5,
            departments = $6::jsonb,
            custom_costs = $7::jsonb,
            notes = $8,
            platform_cost_rate = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING 
            id,
            name,
            start_date::text as "startDate",
            end_date::text as "endDate",
            target_amount::float as "targetAmount",
            platform,
            departments,
            custom_costs as "customCosts",
            notes,
            platform_cost_rate::float as "platformCostRate",
            created_at as "createdAt",
            updated_at as "updatedAt";
    `,
        [
            name,
            startDate,
            endDate,
            targetAmount,
            platform,
            JSON.stringify(departments),
            JSON.stringify(customCosts),
            notes,
            platformCostRate,
            id,
        ]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        targetAmount: parseFloat(row.targetAmount || 0),
        platform: row.platform as EventPlatform,
        departments: row.departments as EventDepartment[],
        customCosts: row.customCosts as CustomCostItem[],
        notes: row.notes,
        platformCostRate: row.platformCostRate !== null && row.platformCostRate !== undefined ? parseFloat(row.platformCostRate) : 25,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    };
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<boolean> {
    await ensureEventsTable();
    const res = await localPool.query(
        `DELETE FROM credentials.campaign_events WHERE id = $1;`,
        [id]
    );
    return (res.rowCount ?? 0) > 0;
}

/**
 * Compute the 8 metrics for an event:
 * 1. sales
 * 2. target
 * 3. spend (using from this system ad cost)
 * 4. total order
 * 5. winning skus
 * 6. total COGS
 * 7. custom cost with item name and amount
 * 8. Profit
 */
export async function calculateEventMetrics(event: CampaignEvent): Promise<EventAnalysisMetrics> {
    const { startDate, endDate, platform, departments, targetAmount, customCosts } = event;

    const isShopeeIncluded = platform === 'combine' || platform === 'shopee';
    const isTiktokIncluded = platform === 'combine' || platform === 'tiktok';

    const isMarketingActive = departments.includes('marketing');
    const isLivehostActive = departments.includes('livehost');
    const isAffiliateActive = departments.includes('affiliate');
    const isOrdersActive = departments.includes('orders');

    // 1. Marketing Department query
    let marketingGmv = 0;
    let marketingVideos = 0;
    let marketingItemsSold = 0;

    if (isMarketingActive && isTiktokIncluded && mktPool) {
        try {
            const mRes = await mktPool.query(
                `
                SELECT 
                    COALESCE(SUM(vr."directGmv"), 0)::float as direct_gmv,
                    COUNT(vr.id)::int as video_count,
                    COALESCE(SUM(vr."directItemsSold"), 0)::int as items_sold
                FROM "VideoRecord" vr
                JOIN "ImportLog" il ON vr."importLogId" = il.id
                WHERE LOWER(vr."creatorName") IN (SELECT LOWER(handle) FROM "InternalHandle")
                  AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') >= $1
                  AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') <= $2;
            `,
                [startDate, endDate]
            );
            if (mRes.rows.length > 0) {
                marketingGmv = parseFloat(mRes.rows[0].direct_gmv || 0);
                marketingVideos = parseInt(mRes.rows[0].video_count || 0, 10);
                marketingItemsSold = parseInt(mRes.rows[0].items_sold || 0, 10);
            }
        } catch (err) {
            console.error('[events-calc] Marketing query error:', err);
        }
    }

    // 2. Livehost Department query
    let livehostGmv = 0;
    let livehostHours = 0;
    let livehostOrders = 0;
    let livehostShopeeGmv = 0;
    let livehostTiktokGmv = 0;

    if (isLivehostActive && livePool) {
        try {
            const pClause =
                platform === 'tiktok'
                    ? "AND LOWER(la.platform) = 'tiktok'"
                    : platform === 'shopee'
                    ? "AND LOWER(la.platform) = 'shopee'"
                    : "AND LOWER(la.platform) IN ('tiktok', 'shopee')";

            const lRes = await livePool.query(
                `
                SELECT 
                    LOWER(la.platform) as platform,
                    COALESCE(SUM(sr."directGmv"), 0)::float as gmv,
                    COALESCE(SUM(sr.hour), 0)::float as hours,
                    COALESCE(SUM(sr."skuOrder"), 0)::int as orders
                FROM "SessionReport" sr
                JOIN "Shift" s ON sr."shiftId" = s.id
                JOIN "LiveAccount" la ON sr."accountId" = la.id
                WHERE COALESCE(s.date, sr."submittedAt") >= $1 
                  AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
                  ${pClause}
                GROUP BY LOWER(la.platform);
            `,
                [startDate, endDate]
            );

            for (const row of lRes.rows) {
                const g = parseFloat(row.gmv || 0);
                const h = parseFloat(row.hours || 0);
                const o = parseInt(row.orders || 0, 10);
                livehostGmv += g;
                livehostHours += h;
                livehostOrders += o;
                if (row.platform === 'shopee') livehostShopeeGmv += g;
                else livehostTiktokGmv += g;
            }
        } catch (err) {
            console.error('[events-calc] Livehost query error:', err);
        }
    }

    // 3. Affiliate Department query
    let affiliateGmv = 0;
    let affiliateOrders = 0;
    let affiliateItemsSold = 0;
    let affiliateShopeeGmv = 0;
    let affiliateTiktokGmv = 0;

    if (isAffiliateActive && affPool) {
        try {
            const pClause =
                platform === 'tiktok'
                    ? "AND LOWER(platform) LIKE '%tiktok%'"
                    : platform === 'shopee'
                    ? "AND LOWER(platform) LIKE '%shopee%'"
                    : "AND (LOWER(platform) LIKE '%tiktok%' OR LOWER(platform) LIKE '%shopee%')";

            const aRes = await affPool.query(
                `
                SELECT 
                    LOWER(platform) as platform,
                    COALESCE(SUM(total_gmv::numeric), 0)::float as gmv,
                    COALESCE(SUM(orders::numeric), 0)::int as orders,
                    COALESCE(SUM(items_sold::numeric), 0)::int as items_sold
                FROM affiliate_records
                WHERE channel = 'External'
                  AND DATE(report_date) >= $1
                  AND DATE(report_date) <= $2
                  AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
                  ${pClause}
                GROUP BY LOWER(platform);
            `,
                [startDate, endDate]
            );

            for (const row of aRes.rows) {
                const g = parseFloat(row.gmv || 0);
                const o = parseInt(row.orders || 0, 10);
                const it = parseInt(row.items_sold || 0, 10);
                affiliateGmv += g;
                affiliateOrders += o;
                affiliateItemsSold += it;
                if (row.platform.includes('shopee')) affiliateShopeeGmv += g;
                else affiliateTiktokGmv += g;
            }
        } catch (err) {
            console.error('[events-calc] Affiliate query error:', err);
        }
    }

    // 4. This system ad spend and store sales (from local Neon DB)
    let shopeeSpend = 0;
    let shopeeStoreGmv = 0;
    let shopeeStoreOrders = 0;

    let tiktokSpend = 0;
    let tiktokStoreGmv = 0;
    let tiktokStoreOrders = 0;

    if (isShopeeIncluded) {
        try {
            const sRes = await localPool.query(
                `
                SELECT 
                    COALESCE(SUM(spend_before_tax), 0)::float as spend,
                    COALESCE(SUM(gmv), 0)::float as gmv,
                    COALESCE(SUM(order_count), 0)::int as orders
                FROM credentials.daily_shopee_metrics
                WHERE date >= $1 AND date <= $2;
            `,
                [startDate, endDate]
            );
            if (sRes.rows.length > 0) {
                shopeeSpend = parseFloat(sRes.rows[0].spend || 0);
                shopeeStoreGmv = parseFloat(sRes.rows[0].gmv || 0);
                shopeeStoreOrders = parseInt(sRes.rows[0].orders || 0, 10);
            }
        } catch (err) {
            console.error('[events-calc] Local shopee metrics error:', err);
        }
    }

    if (isTiktokIncluded) {
        try {
            const tRes = await localPool.query(
                `
                SELECT 
                    COALESCE(SUM(spend_before_tax), 0)::float as spend,
                    COALESCE(SUM(gmv), 0)::float as gmv,
                    COALESCE(SUM(order_count), 0)::int as orders
                FROM credentials.daily_shop_metrics
                WHERE date >= $1 AND date <= $2;
            `,
                [startDate, endDate]
            );
            if (tRes.rows.length > 0) {
                tiktokSpend = parseFloat(tRes.rows[0].spend || 0);
                tiktokStoreGmv = parseFloat(tRes.rows[0].gmv || 0);
                tiktokStoreOrders = parseInt(tRes.rows[0].orders || 0, 10);
            }
        } catch (err) {
            console.error('[events-calc] Local tiktok metrics error:', err);
        }
    }

    const totalSpend = shopeeSpend + tiktokSpend;
    const storeSales = shopeeStoreGmv + tiktokStoreGmv;
    const departmentSales = marketingGmv + livehostGmv + affiliateGmv;

    // By default, if store/orders department is selected, use storeSales if available, else sum of departments
    const totalSales = storeSales > 0 ? storeSales : departmentSales;

    // 5. Stock Orders, Winning SKUs, and COGS from DB_STOCK_URL
    let winningSkus: WinningSkuItem[] = [];
    let totalCogs = 0;
    let stockOrdersCount = 0;
    let stockUnitsCount = 0;

    if (stockPool) {
        try {
            const pStockClause =
                platform === 'tiktok'
                    ? "AND LOWER(marketplace) = 'tiktok'"
                    : platform === 'shopee'
                    ? "AND LOWER(marketplace) = 'shopee'"
                    : "AND LOWER(marketplace) IN ('tiktok', 'shopee')";

            // Single SKUs
            const singleSkus = await stockPool.query(
                "SELECT merchant_sku, cost FROM skus WHERE type='single'"
            );
            const costMap = new Map<string, number>();
            singleSkus.rows.forEach((r) => {
                if (r.cost !== null && r.cost !== undefined) {
                    costMap.set(r.merchant_sku.trim().toLowerCase(), parseFloat(r.cost));
                }
            });

            // Combo SKUs
            const comboRes = await stockPool.query(`
                SELECT s.merchant_sku, cc.component_sku, cc.qty, comp.cost as comp_cost
                FROM skus s
                JOIN combo_components cc ON s.merchant_sku = cc.parent_sku
                LEFT JOIN skus comp ON cc.component_sku = comp.merchant_sku
                WHERE s.type = 'combo';
            `);
            const comboMap = new Map<string, number>();
            comboRes.rows.forEach((r) => {
                const parent = r.merchant_sku.trim().toLowerCase();
                const cur = comboMap.get(parent) || 0;
                const itemCost = (parseFloat(r.comp_cost) || 0) * (r.qty || 1);
                comboMap.set(parent, cur + itemCost);
            });

            const getSkuCost = (sku: string): number => {
                if (!sku) return 0;
                const key = sku.trim().toLowerCase();
                return costMap.get(key) ?? comboMap.get(key) ?? 0;
            };

            // Winning SKUs (Top 20 products by quantity sold)
            const winningSkusRes = await stockPool.query(
                `
                SELECT 
                    merchant_sku,
                    product_name,
                    COUNT(DISTINCT order_no)::int as orders,
                    SUM(quantity)::int as total_qty
                FROM orders
                WHERE order_time >= $1 AND order_time <= ($2::date + interval '1 day' - interval '1 second')
                  ${pStockClause}
                GROUP BY merchant_sku, product_name
                ORDER BY total_qty DESC
                LIMIT 20;
            `,
                [startDate, endDate]
            );

            winningSkus = winningSkusRes.rows.map((item) => {
                const unitCost = getSkuCost(item.merchant_sku);
                const totalItemCogs = unitCost * item.total_qty;
                return {
                    sku: item.merchant_sku || 'UNKNOWN',
                    name: item.product_name || item.merchant_sku || 'Unnamed Product',
                    orders: item.orders,
                    unitsSold: item.total_qty,
                    unitCost: parseFloat(unitCost.toFixed(2)),
                    totalCogs: parseFloat(totalItemCogs.toFixed(2)),
                };
            });

            // Total COGS across ALL sold items in the period
            const allSoldRes = await stockPool.query(
                `
                SELECT 
                    merchant_sku,
                    SUM(quantity)::int as total_qty
                FROM orders
                WHERE order_time >= $1 AND order_time <= ($2::date + interval '1 day' - interval '1 second')
                  ${pStockClause}
                GROUP BY merchant_sku;
            `,
                [startDate, endDate]
            );

            for (const row of allSoldRes.rows) {
                const unitCost = getSkuCost(row.merchant_sku);
                totalCogs += unitCost * (row.total_qty || 0);
            }

            // Total stock orders
            const stockCountRes = await stockPool.query(
                `
                SELECT 
                    COUNT(DISTINCT order_no)::int as total_orders,
                    SUM(quantity)::int as total_units
                FROM orders
                WHERE order_time >= $1 AND order_time <= ($2::date + interval '1 day' - interval '1 second')
                  ${pStockClause};
            `,
                [startDate, endDate]
            );

            if (stockCountRes.rows.length > 0) {
                stockOrdersCount = parseInt(stockCountRes.rows[0].total_orders || 0, 10);
                stockUnitsCount = parseInt(stockCountRes.rows[0].total_units || 0, 10);
            }
        } catch (err) {
            console.error('[events-calc] Stock inventory COGS & orders error:', err);
        }
    }

    // Determine total orders
    const totalOrders = stockOrdersCount > 0 ? stockOrdersCount : shopeeStoreOrders + tiktokStoreOrders;

    // 7. Platform Cost (default 25% from total sales, user configurable)
    const platformCostRate = typeof event.platformCostRate === 'number' ? event.platformCostRate : 25;
    const platformCost = (totalSales * platformCostRate) / 100;

    // 8. Custom Costs
    const totalCustomCosts = customCosts.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);

    // 9. Profit Calculation: Sales - Ad Spend - Total COGS - Platform Cost - Custom Costs
    const profit = totalSales - totalSpend - totalCogs - platformCost - totalCustomCosts;
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
    const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const netRoas = totalSpend > 0 ? profit / totalSpend : 0;
    const aov = totalOrders > 0 ? totalSales / totalOrders : 0;
    const cogsPercentage = totalSales > 0 ? (totalCogs / totalSales) * 100 : 0;
    const targetAttainment = targetAmount > 0 ? (totalSales / targetAmount) * 100 : 0;
    const targetVariance = totalSales - targetAmount;

    return {
        sales: parseFloat(totalSales.toFixed(2)),
        storeSales: parseFloat(storeSales.toFixed(2)),
        departmentSales: parseFloat(departmentSales.toFixed(2)),
        target: targetAmount,
        targetAttainment: parseFloat(targetAttainment.toFixed(1)),
        targetVariance: parseFloat(targetVariance.toFixed(2)),
        spend: parseFloat(totalSpend.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        totalOrders,
        aov: parseFloat(aov.toFixed(2)),
        winningSkus,
        totalCogs: parseFloat(totalCogs.toFixed(2)),
        cogsPercentage: parseFloat(cogsPercentage.toFixed(1)),
        platformCost: parseFloat(platformCost.toFixed(2)),
        platformCostRate: parseFloat(platformCostRate.toFixed(1)),
        customCosts,
        totalCustomCosts: parseFloat(totalCustomCosts.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        netRoas: parseFloat(netRoas.toFixed(2)),
        departmentBreakdown: {
            marketing: {
                gmv: parseFloat(marketingGmv.toFixed(2)),
                videos: marketingVideos,
                itemsSold: marketingItemsSold,
                enabled: isMarketingActive,
            },
            livehost: {
                gmv: parseFloat(livehostGmv.toFixed(2)),
                hours: parseFloat(livehostHours.toFixed(1)),
                orders: livehostOrders,
                enabled: isLivehostActive,
            },
            affiliate: {
                gmv: parseFloat(affiliateGmv.toFixed(2)),
                orders: affiliateOrders,
                itemsSold: affiliateItemsSold,
                enabled: isAffiliateActive,
            },
            storeOrders: {
                orders: stockOrdersCount,
                units: stockUnitsCount,
                enabled: isOrdersActive,
            },
        },
        platformBreakdown: {
            shopee: {
                gmv: parseFloat((shopeeStoreGmv || livehostShopeeGmv + affiliateShopeeGmv).toFixed(2)),
                spend: parseFloat(shopeeSpend.toFixed(2)),
                orders: shopeeStoreOrders,
            },
            tiktok: {
                gmv: parseFloat(
                    (tiktokStoreGmv || marketingGmv + livehostTiktokGmv + affiliateTiktokGmv).toFixed(2)
                ),
                spend: parseFloat(tiktokSpend.toFixed(2)),
                orders: tiktokStoreOrders,
            },
        },
    };
}
