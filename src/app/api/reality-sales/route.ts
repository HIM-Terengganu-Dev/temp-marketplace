import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { pool as localPool } from '@/lib/db';
import { getDepartmentTargets } from '@/lib/department-targets';

if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

export const dynamic = 'force-dynamic';

// Singleton connection pools with connection guards
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

const LIVEHOST_CATEGORY_SQL = `
    CASE
        WHEN u.role = 'EXTERNAL_HOST' THEN 'EXTERNAL'
        WHEN u.role = 'AI_LIVE' THEN 'AI_LIVE'
        WHEN u.role = 'RELIVE' THEN 'RELIVE'
        WHEN u.role = 'DR_SAMHAN' THEN 'DR_SAMHAN'
        WHEN s.notes ~* 'Type:\\s*([A-Za-z0-9_ -]+)' THEN
            CASE
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'RELIVE|RE_LIVE' THEN 'RELIVE'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'EXTERNAL' THEN 'EXTERNAL'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'AI' THEN 'AI_LIVE'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'SAMHAN' THEN 'DR_SAMHAN'
                ELSE 'INTERNAL'
            END
        ELSE 'INTERNAL'
    END
`;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Date range extraction
        const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const [y, m] = todayKL.split('-');
        const defaultMonth = `${y}-${m}`;

        const month = searchParams.get('month') || defaultMonth;
        const startDate = searchParams.get('startDate') || `${month}-01`;
        // Last day of month or given endDate
        const [targetYear, targetMonthNum] = month.split('-').map(Number);
        const lastDayOfMonth = new Date(targetYear, targetMonthNum, 0).getDate();
        const defaultEndDate = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;
        const endDate = searchParams.get('endDate') || defaultEndDate;

        // Fetch configured targets for all departments for this month
        const deptTargets = await getDepartmentTargets(month);

        // Run all department queries in parallel with independent try/catch boundaries
        const [marketingData, livehostData, affiliateData, stockData] = await Promise.all([
            fetchMarketingDepartment(month, startDate, endDate, deptTargets.marketing.targetAmount),
            fetchLivehostDepartment(month, startDate, endDate, deptTargets.livehost.targetAmount),
            fetchAffiliateDepartment(month, startDate, endDate, deptTargets.affiliate.targetAmount),
            fetchStockInventoryDepartment(startDate, endDate)
        ]);

        return NextResponse.json({
            success: true,
            month,
            startDate,
            endDate,
            targets: deptTargets,
            marketing: marketingData,
            livehost: livehostData,
            affiliate: affiliateData,
            stock: stockData,
        });
    } catch (err: any) {
        console.error('[reality-sales] GET fatal error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

// -------------------------------------------------------------
// 1. MARKETING DEPARTMENT
// -------------------------------------------------------------
async function fetchMarketingDepartment(month: string, startDate: string, endDate: string, targetAmount: number) {
    if (!mktPool) {
        return {
            status: 'disconnected',
            hasData: false,
            targetAmount,
            totalSales: 0,
            totalVideos: 0,
            totalItemsSold: 0,
            attainmentRate: 0,
            teams: [],
            error: 'DB_MARKETING_URL not configured'
        };
    }

    try {
        // Query sales specifically for internal handles
        const salesRes = await mktPool.query(`
            SELECT 
                vr."creatorName" as handle,
                COUNT(vr.id)::int as video_count,
                COALESCE(SUM(vr."directGmv"), 0)::float as direct_gmv,
                COALESCE(SUM(vr."attributedGmv"), 0)::float as attributed_gmv,
                COALESCE(SUM(vr."views"), 0)::int as views,
                COALESCE(SUM(vr."likes"), 0)::int as likes,
                COALESCE(SUM(vr."directItemsSold"), 0)::int as direct_items_sold
            FROM "VideoRecord" vr
            JOIN "ImportLog" il ON vr."importLogId" = il.id
            WHERE LOWER(vr."creatorName") IN (SELECT LOWER(handle) FROM "InternalHandle")
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') >= $1
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') <= $2
            GROUP BY vr."creatorName"
            ORDER BY direct_gmv DESC;
        `, [startDate, endDate]);

        // Also get all registered internal handles to show complete team roster
        const rosterRes = await mktPool.query(`
            SELECT DISTINCT handle 
            FROM "InternalHandle"
            ORDER BY handle;
        `);
        const allRosterHandles = rosterRes.rows.map(r => r.handle);

        const salesMap = new Map<string, any>();
        let totalSales = 0;
        let totalVideos = 0;
        let totalItemsSold = 0;

        for (const row of salesRes.rows) {
            totalSales += row.direct_gmv;
            totalVideos += row.video_count;
            totalItemsSold += row.direct_items_sold;
            salesMap.set(row.handle.toLowerCase(), row);
        }

        const teams = allRosterHandles.map(handle => {
            const row = salesMap.get(handle.toLowerCase());
            return {
                handle,
                videoCount: row ? row.video_count : 0,
                directGmv: row ? row.direct_gmv : 0,
                attributedGmv: row ? row.attributed_gmv : 0,
                views: row ? row.views : 0,
                likes: row ? row.likes : 0,
                directItemsSold: row ? row.direct_items_sold : 0,
                hasActivity: !!row
            };
        }).sort((a, b) => b.directGmv - a.directGmv);

        const hasData = salesRes.rows.length > 0;
        const attainmentRate = targetAmount > 0 ? (totalSales / targetAmount) * 100 : 0;

        return {
            status: 'connected',
            hasData,
            targetAmount,
            totalSales,
            totalVideos,
            totalItemsSold,
            attainmentRate,
            teams,
            message: hasData ? null : `No marketing sales data found for ${month} (${startDate} to ${endDate}). Please upload or verify marketing tracking logs.`
        };
    } catch (err: any) {
        console.error('[reality-sales] Marketing query error:', err);
        return {
            status: 'error',
            hasData: false,
            targetAmount,
            totalSales: 0,
            totalVideos: 0,
            totalItemsSold: 0,
            attainmentRate: 0,
            teams: [],
            error: err.message
        };
    }
}

// -------------------------------------------------------------
// 2. LIVE HOST DEPARTMENT
// -------------------------------------------------------------
async function fetchLivehostDepartment(month: string, startDate: string, endDate: string, targetAmount: number) {
    if (!livePool) {
        return {
            status: 'disconnected',
            hasData: false,
            targetAmount,
            totalGmv: 0,
            attainmentRate: 0,
            categories: {},
            topHosts: [],
            error: 'DB_LIVEHOST_URL not configured'
        };
    }

    try {
        // Query Category x Platform breakdown
        const catRes = await livePool.query(`
            SELECT 
                (${LIVEHOST_CATEGORY_SQL}) as category,
                LOWER(la.platform) as platform,
                COUNT(sr.id)::int as sessions,
                COALESCE(SUM(sr.hour), 0)::float as total_hours,
                COALESCE(SUM(sr."directGmv"), 0)::float as direct_gmv,
                COALESCE(SUM(sr.viewer), 0)::int as viewers,
                COALESCE(SUM(sr."productClick"), 0)::int as product_clicks,
                COALESCE(SUM(sr."skuOrder"), 0)::int as sku_orders
            FROM "SessionReport" sr
            JOIN "Shift" s ON sr."shiftId" = s.id
            JOIN "User" u ON sr."userId" = u.id
            JOIN "LiveAccount" la ON sr."accountId" = la.id
            WHERE COALESCE(s.date, sr."submittedAt") >= $1 
              AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY category, LOWER(la.platform)
            ORDER BY category, platform;
        `, [startDate, endDate]);

        // Query Top Hosts
        const hostsRes = await livePool.query(`
            SELECT 
                COALESCE(u."fullName", u.username) as host_name,
                (${LIVEHOST_CATEGORY_SQL}) as category,
                LOWER(la.platform) as platform,
                COUNT(sr.id)::int as sessions,
                COALESCE(SUM(sr.hour), 0)::float as total_hours,
                COALESCE(SUM(sr."directGmv"), 0)::float as direct_gmv
            FROM "SessionReport" sr
            JOIN "Shift" s ON sr."shiftId" = s.id
            JOIN "User" u ON sr."userId" = u.id
            JOIN "LiveAccount" la ON sr."accountId" = la.id
            WHERE COALESCE(s.date, sr."submittedAt") >= $1 
              AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY COALESCE(u."fullName", u.username), category, LOWER(la.platform)
            HAVING SUM(sr."directGmv") > 0
            ORDER BY direct_gmv DESC
            LIMIT 15;
        `, [startDate, endDate]);

        // Structured mapping for the required categories
        const categories = {
            INTERNAL: {
                label: 'Internal Host',
                shopeeGmv: 0,
                shopeeSessions: 0,
                shopeeHours: 0,
                tiktokGmv: 0,
                tiktokSessions: 0,
                tiktokHours: 0,
                totalGmv: 0
            },
            EXTERNAL: {
                label: 'External Host',
                shopeeGmv: 0,
                shopeeSessions: 0,
                shopeeHours: 0,
                tiktokGmv: 0,
                tiktokSessions: 0,
                tiktokHours: 0,
                totalGmv: 0
            },
            RELIVE: {
                label: 'ReLive',
                shopeeGmv: 0,
                shopeeSessions: 0,
                shopeeHours: 0,
                tiktokGmv: 0,
                tiktokSessions: 0,
                tiktokHours: 0,
                totalGmv: 0
            },
            DR_SAMHAN: {
                label: 'DrSamhan',
                shopeeGmv: 0,
                shopeeSessions: 0,
                shopeeHours: 0,
                tiktokGmv: 0,
                tiktokSessions: 0,
                tiktokHours: 0,
                totalGmv: 0
            },
            AI_LIVE: {
                label: 'Ai Live',
                shopeeGmv: 0,
                shopeeSessions: 0,
                shopeeHours: 0,
                tiktokGmv: 0,
                tiktokSessions: 0,
                tiktokHours: 0,
                totalGmv: 0
            }
        };

        let totalGmv = 0;
        let totalSessions = 0;
        let totalHours = 0;

        for (const row of catRes.rows) {
            const cat = row.category as keyof typeof categories;
            if (categories[cat]) {
                const gmv = row.direct_gmv || 0;
                const sess = row.sessions || 0;
                const hrs = row.total_hours || 0;

                totalGmv += gmv;
                totalSessions += sess;
                totalHours += hrs;
                categories[cat].totalGmv += gmv;

                if (row.platform === 'shopee') {
                    categories[cat].shopeeGmv += gmv;
                    categories[cat].shopeeSessions += sess;
                    categories[cat].shopeeHours += hrs;
                } else {
                    categories[cat].tiktokGmv += gmv;
                    categories[cat].tiktokSessions += sess;
                    categories[cat].tiktokHours += hrs;
                }
            }
        }

        const attainmentRate = targetAmount > 0 ? (totalGmv / targetAmount) * 100 : 0;

        return {
            status: 'connected',
            hasData: catRes.rows.length > 0,
            targetAmount,
            totalGmv,
            totalSessions,
            totalHours,
            attainmentRate,
            categories,
            topHosts: hostsRes.rows
        };
    } catch (err: any) {
        console.error('[reality-sales] Livehost query error:', err);
        return {
            status: 'error',
            hasData: false,
            targetAmount,
            totalGmv: 0,
            attainmentRate: 0,
            categories: {},
            topHosts: [],
            error: err.message
        };
    }
}

// -------------------------------------------------------------
// 3. AFFILIATE DEPARTMENT
// -------------------------------------------------------------
async function fetchAffiliateDepartment(month: string, startDate: string, endDate: string, targetAmount: number) {
    if (!affPool) {
        return {
            status: 'disconnected',
            hasData: false,
            targetAmount,
            totalGmv: 0,
            shopeeGmv: 0,
            tiktokGmv: 0,
            attainmentRate: 0,
            topAffiliates: [],
            error: 'DB_AFFILIATE_URL not configured'
        };
    }

    try {
        // Query strictly External sales for Shopee and TikTok
        const platformRes = await affPool.query(`
            SELECT 
                platform,
                COUNT(*)::int as record_count,
                COUNT(DISTINCT username)::int as creator_count,
                COALESCE(SUM(total_gmv::numeric), 0)::float as total_gmv,
                COALESCE(SUM(video_sales::numeric), 0)::float as video_gmv,
                COALESCE(SUM(total_live_gmv::numeric), 0)::float as live_gmv,
                COALESCE(SUM(items_sold::numeric), 0)::int as items_sold,
                COALESCE(SUM(orders::numeric), 0)::int as total_orders
            FROM affiliate_records
            WHERE channel = 'External'
              AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
              AND DATE(report_date) >= $1
              AND DATE(report_date) <= $2
            GROUP BY platform;
        `, [startDate, endDate]);

        let totalGmv = 0;
        let shopeeGmv = 0;
        let tiktokGmv = 0;
        let totalItemsSold = 0;
        let totalOrders = 0;

        for (const row of platformRes.rows) {
            const gmv = row.total_gmv || 0;
            totalGmv += gmv;
            totalItemsSold += row.items_sold || 0;
            totalOrders += row.total_orders || 0;

            if (row.platform.toLowerCase().includes('shopee')) {
                shopeeGmv += gmv;
            } else if (row.platform.toLowerCase().includes('tiktok')) {
                tiktokGmv += gmv;
            }
        }

        // Top External Affiliates
        const topAffRes = await affPool.query(`
            SELECT 
                username,
                platform,
                tier,
                COALESCE(SUM(total_gmv::numeric), 0)::float as total_gmv,
                COALESCE(SUM(video_sales::numeric), 0)::float as video_gmv,
                COALESCE(SUM(total_live_gmv::numeric), 0)::float as live_gmv,
                COALESCE(SUM(items_sold::numeric), 0)::int as items_sold,
                COALESCE(SUM(orders::numeric), 0)::int as total_orders
            FROM affiliate_records
            WHERE channel = 'External'
              AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
              AND DATE(report_date) >= $1
              AND DATE(report_date) <= $2
            GROUP BY username, platform, tier
            HAVING SUM(total_gmv::numeric) > 0
            ORDER BY total_gmv DESC
            LIMIT 20;
        `, [startDate, endDate]);

        const attainmentRate = targetAmount > 0 ? (totalGmv / targetAmount) * 100 : 0;

        return {
            status: 'connected',
            hasData: platformRes.rows.length > 0,
            targetAmount,
            totalGmv,
            shopeeGmv,
            tiktokGmv,
            totalItemsSold,
            totalOrders,
            attainmentRate,
            platforms: platformRes.rows,
            topAffiliates: topAffRes.rows
        };
    } catch (err: any) {
        console.error('[reality-sales] Affiliate query error:', err);
        return {
            status: 'error',
            hasData: false,
            targetAmount,
            totalGmv: 0,
            shopeeGmv: 0,
            tiktokGmv: 0,
            attainmentRate: 0,
            topAffiliates: [],
            error: err.message
        };
    }
}

// -------------------------------------------------------------
// 4. STOCK INVENTORY DEPARTMENT
// -------------------------------------------------------------
async function fetchStockInventoryDepartment(startDate: string, endDate: string) {
    if (!stockPool) {
        return {
            status: 'disconnected',
            hasData: false,
            cogsOverview: { singleCount: 0, comboCount: 0, singleWithCost: 0 },
            singleSkus: [],
            comboSkus: [],
            ordersSummary: [],
            recentOrders: [],
            error: 'DB_STOCK_URL not configured'
        };
    }

    try {
        // 1. Single SKUs
        const singleSkusRes = await stockPool.query(`
            SELECT 
                merchant_sku,
                product_category,
                sale_class,
                cost::float as cost,
                created_at,
                updated_at
            FROM skus
            WHERE type = 'single'
            ORDER BY merchant_sku ASC;
        `);

        // 2. Combo SKUs and component recipes
        const comboSkusRes = await stockPool.query(`
            SELECT 
                s.merchant_sku,
                s.product_category,
                s.sale_class,
                s.created_at,
                s.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'component_sku', cc.component_sku,
                            'qty', cc.qty,
                            'component_cost', comp.cost::float
                        )
                    ) FILTER (WHERE cc.component_sku IS NOT NULL), '[]'::json
                ) as components
            FROM skus s
            LEFT JOIN combo_components cc ON s.merchant_sku = cc.parent_sku
            LEFT JOIN skus comp ON cc.component_sku = comp.merchant_sku
            WHERE s.type = 'combo'
            GROUP BY s.merchant_sku, s.product_category, s.sale_class, s.created_at, s.updated_at
            ORDER BY s.merchant_sku ASC;
        `);

        // Calculate rolled-up combo COGS
        const comboSkus = comboSkusRes.rows.map(combo => {
            let totalCogs = 0;
            let isCompleteCost = true;
            const components = combo.components || [];

            for (const c of components) {
                if (c.component_cost !== null && c.component_cost !== undefined) {
                    totalCogs += (c.qty || 1) * c.component_cost;
                } else {
                    isCompleteCost = false;
                }
            }

            return {
                ...combo,
                totalCogs: totalCogs > 0 ? parseFloat(totalCogs.toFixed(2)) : null,
                isCompleteCost
            };
        });

        // 3. Orders breakdown
        const ordersSummaryRes = await stockPool.query(`
            SELECT 
                marketplace,
                store,
                order_status,
                COUNT(*)::int as order_count,
                COALESCE(SUM(quantity), 0)::int as total_quantity
            FROM orders
            WHERE order_time >= $1 AND order_time <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY marketplace, store, order_status
            ORDER BY order_count DESC;
        `, [startDate, endDate]);

        // 4. Recent orders
        const recentOrdersRes = await stockPool.query(`
            SELECT 
                id,
                order_no,
                marketplace,
                store,
                merchant_sku,
                quantity,
                order_time,
                order_status,
                tracking_number
            FROM orders
            WHERE order_time >= $1 AND order_time <= ($2::date + interval '1 day' - interval '1 second')
            ORDER BY order_time DESC
            LIMIT 50;
        `, [startDate, endDate]);

        // Aggregate statistics
        const singleSkus = singleSkusRes.rows;
        const singleWithCost = singleSkus.filter(s => s.cost !== null).length;
        const comboWithCost = comboSkus.filter(c => c.totalCogs !== null).length;

        let totalUnitsSold = 0;
        let totalOrdersCount = 0;
        for (const row of ordersSummaryRes.rows) {
            totalOrdersCount += row.order_count;
            totalUnitsSold += row.total_quantity;
        }

        return {
            status: 'connected',
            hasData: true,
            cogsOverview: {
                totalSkus: singleSkus.length + comboSkus.length,
                singleCount: singleSkus.length,
                comboCount: comboSkus.length,
                singleWithCost,
                comboWithCost,
                totalOrdersCount,
                totalUnitsSold
            },
            singleSkus,
            comboSkus,
            ordersSummary: ordersSummaryRes.rows,
            recentOrders: recentOrdersRes.rows
        };
    } catch (err: any) {
        console.error('[reality-sales] Stock inventory query error:', err);
        return {
            status: 'error',
            hasData: false,
            cogsOverview: { singleCount: 0, comboCount: 0, singleWithCost: 0 },
            singleSkus: [],
            comboSkus: [],
            ordersSummary: [],
            recentOrders: [],
            error: err.message
        };
    }
}
