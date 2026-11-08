import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { pool as localPool } from '@/lib/db';
import { getDepartmentTargets, getHistoricalDepartmentTargets } from '@/lib/department-targets';
import {
    fetchMarketingDepartmentFromSheets,
    fetchMarketingMonthlyTrendsFromSheets
} from '@/lib/google-sheets-marketing';

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

// HIM Wellness shop filters (Excludes WEROCA shops: TikTok shops 3 & 4 and WEROCA Shopee accounts)
const SHOPEE_HIM_IDS = [1077500606, 1256177782, 1285322524, 1290223366, 1298030530];
const TIKTOK_HIM_NUMBERS = [1, 2];

// SQL condition to isolate true external affiliates (excludes internal team handles even if mislabeled in DB)
const AFFILIATE_EXTERNAL_FILTER_SQL = `
    channel = 'External'
    AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
    AND NOT (
        LOWER(username) ~* '^(dr\\.?samhan|himcoffee|affiliatedrsamhan)'
        OR LOWER(username) IN ('eynaaa342', 'samaffiliate4')
    )
`;

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

        const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const [y, m] = todayKL.split('-');
        const currentYear = parseInt(y, 10) || 2026;
        const currentMonth = parseInt(m, 10) || 7;

        // Multi-Month Trends handler
        if (searchParams.get('action') === 'trends' || searchParams.get('mode') === 'trends') {
            const year = parseInt(searchParams.get('year') || String(currentYear), 10);
            const trendData = await fetchRealitySalesTrends(year, currentYear, currentMonth);
            return NextResponse.json(trendData);
        }

        // Date range extraction
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
        const [overallData, marketingData, livehostData, affiliateData, stockData] = await Promise.all([
            fetchOverallSales(month, startDate, endDate, deptTargets.overall.targetAmount),
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
            overall: overallData,
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
// 0. OVERALL TOTAL SALES (TIKTOK SHOP + SHOPEE PLATFORM RECONCILIATION - HIM WELLNESS ONLY)
// -------------------------------------------------------------
async function fetchOverallSales(month: string, startDate: string, endDate: string, targetAmount: number) {
    try {
        // Query daily Shopee metrics (HIM Wellness only)
        const shopeeRes = await localPool.query(`
            SELECT 
                COALESCE(SUM(gmv), 0)::float as gmv,
                COALESCE(SUM(order_count), 0)::int as orders,
                COALESCE(SUM(spend_before_tax), 0)::float as spend,
                COALESCE(SUM(cancelled_gmv), 0)::float as cancelled_gmv,
                COALESCE(SUM(cancelled_order_count), 0)::int as cancelled_orders,
                COUNT(DISTINCT date)::int as active_days
            FROM credentials.daily_shopee_metrics
            WHERE date >= $1 AND date <= $2
              AND shop_id = ANY(ARRAY[${SHOPEE_HIM_IDS.join(',')}]::bigint[])
        `, [startDate, endDate]);

        // Query daily TikTok metrics (HIM Wellness only: Shop 1 & 2)
        const tiktokRes = await localPool.query(`
            SELECT 
                COALESCE(SUM(gmv), 0)::float as gmv,
                COALESCE(SUM(order_count), 0)::int as orders,
                COALESCE(SUM(spend_before_tax), 0)::float as spend,
                COALESCE(SUM(cancelled_gmv), 0)::float as cancelled_gmv,
                COALESCE(SUM(cancelled_order_count), 0)::int as cancelled_orders,
                COUNT(DISTINCT date)::int as active_days
            FROM credentials.daily_shop_metrics
            WHERE date >= $1 AND date <= $2
              AND shop_number = ANY(ARRAY[${TIKTOK_HIM_NUMBERS.join(',')}]::int[])
        `, [startDate, endDate]);

        const shopeeRow = shopeeRes.rows[0] || { gmv: 0, orders: 0, spend: 0, cancelled_gmv: 0, cancelled_orders: 0, active_days: 0 };
        const tiktokRow = tiktokRes.rows[0] || { gmv: 0, orders: 0, spend: 0, cancelled_gmv: 0, cancelled_orders: 0, active_days: 0 };

        const shopeeGmv = parseFloat(shopeeRow.gmv) || 0;
        const tiktokGmv = parseFloat(tiktokRow.gmv) || 0;
        const totalGmv = shopeeGmv + tiktokGmv;

        const shopeeOrders = parseInt(shopeeRow.orders, 10) || 0;
        const tiktokOrders = parseInt(tiktokRow.orders, 10) || 0;
        const totalOrders = shopeeOrders + tiktokOrders;

        const shopeeSpend = parseFloat(shopeeRow.spend) || 0;
        const tiktokSpend = parseFloat(tiktokRow.spend) || 0;
        const totalSpend = shopeeSpend + tiktokSpend;

        // Check MTD targets for TikTok split if configured (prefer HIMWELLNESS target)
        let tiktokTarget = 0;
        let shopeeTarget = 0;
        try {
            const mtdTargetRes = await localPool.query(`
                SELECT monthly_target, tiktok_target_val
                FROM credentials.mtd_targets
                WHERE target_month = $1 AND company = 'HIMWELLNESS'
                LIMIT 1
            `, [month]);
            if (mtdTargetRes.rows.length > 0) {
                const mt = mtdTargetRes.rows[0];
                tiktokTarget = parseFloat(mt.tiktok_target_val) || 0;
                const mTotal = parseFloat(mt.monthly_target) || targetAmount;
                shopeeTarget = Math.max(0, mTotal - tiktokTarget);
            } else {
                const fallbackRes = await localPool.query(`
                    SELECT monthly_target, tiktok_target_val
                    FROM credentials.mtd_targets
                    WHERE target_month = $1 AND company = 'ALL'
                    LIMIT 1
                `, [month]);
                if (fallbackRes.rows.length > 0) {
                    const mt = fallbackRes.rows[0];
                    tiktokTarget = parseFloat(mt.tiktok_target_val) || 0;
                    const mTotal = parseFloat(mt.monthly_target) || targetAmount;
                    shopeeTarget = Math.max(0, mTotal - tiktokTarget);
                }
            }
        } catch (_) {}

        if (tiktokTarget === 0 && targetAmount > 0) {
            tiktokTarget = Math.round(targetAmount * 0.75);
            shopeeTarget = targetAmount - tiktokTarget;
        }

        const attainmentRate = targetAmount > 0 ? (totalGmv / targetAmount) * 100 : 0;
        const tiktokAttainment = tiktokTarget > 0 ? (tiktokGmv / tiktokTarget) * 100 : 0;
        const shopeeAttainment = shopeeTarget > 0 ? (shopeeGmv / shopeeTarget) * 100 : 0;

        const tiktokShare = totalGmv > 0 ? (tiktokGmv / totalGmv) * 100 : 0;
        const shopeeShare = totalGmv > 0 ? (shopeeGmv / totalGmv) * 100 : 0;

        return {
            status: 'connected',
            hasData: totalGmv > 0,
            targetAmount,
            totalGmv,
            totalOrders,
            totalSpend,
            attainmentRate,
            variance: totalGmv - targetAmount,
            blendedRoas: totalSpend > 0 ? totalGmv / totalSpend : 0,
            tiktok: {
                gmv: tiktokGmv,
                orders: tiktokOrders,
                spend: tiktokSpend,
                targetAmount: tiktokTarget,
                attainmentRate: tiktokAttainment,
                sharePct: tiktokShare,
                roas: tiktokSpend > 0 ? tiktokGmv / tiktokSpend : 0,
                activeDays: tiktokRow.active_days || 0
            },
            shopee: {
                gmv: shopeeGmv,
                orders: shopeeOrders,
                spend: shopeeSpend,
                targetAmount: shopeeTarget,
                attainmentRate: shopeeAttainment,
                sharePct: shopeeShare,
                roas: shopeeSpend > 0 ? shopeeGmv / shopeeSpend : 0,
                activeDays: shopeeRow.active_days || 0
            }
        };
    } catch (err: any) {
        console.error('[reality-sales] Overall sales query error:', err);
        return {
            status: 'error',
            hasData: false,
            targetAmount,
            totalGmv: 0,
            totalOrders: 0,
            totalSpend: 0,
            attainmentRate: 0,
            variance: 0,
            blendedRoas: 0,
            tiktok: { gmv: 0, orders: 0, spend: 0, targetAmount: 0, attainmentRate: 0, sharePct: 0, roas: 0, activeDays: 0 },
            shopee: { gmv: 0, orders: 0, spend: 0, targetAmount: 0, attainmentRate: 0, sharePct: 0, roas: 0, activeDays: 0 },
            error: err.message
        };
    }
}

// -------------------------------------------------------------
// 1. MARKETING DEPARTMENT
// -------------------------------------------------------------
async function fetchMarketingDepartment(month: string, startDate: string, endDate: string, targetAmount: number) {
    // 1. Primary: Google Sheets HIM Creative Master Database (Read-Only)
    try {
        const sheetData = await fetchMarketingDepartmentFromSheets(month, startDate, endDate, targetAmount);
        if (sheetData.hasData || sheetData.status === 'connected') {
            return sheetData;
        }
    } catch (sheetErr: any) {
        console.warn('[reality-sales] Google Sheets fetch failed, checking Postgres fallback:', sheetErr.message);
    }

    // 2. Fallback: Postgres DB_MARKETING_URL
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
            error: 'Neither Google Sheets nor DB_MARKETING_URL available'
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
        let tiktokGmv = 0;
        let shopeeGmv = 0;
        let tiktokSessions = 0;
        let shopeeSessions = 0;
        let tiktokHours = 0;
        let shopeeHours = 0;

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
                    shopeeGmv += gmv;
                    shopeeSessions += sess;
                    shopeeHours += hrs;
                } else {
                    categories[cat].tiktokGmv += gmv;
                    categories[cat].tiktokSessions += sess;
                    categories[cat].tiktokHours += hrs;
                    tiktokGmv += gmv;
                    tiktokSessions += sess;
                    tiktokHours += hrs;
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
            tiktokGmv,
            shopeeGmv,
            tiktokSessions,
            shopeeSessions,
            tiktokHours,
            shopeeHours,
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
        // Query strictly External sales for Shopee and TikTok (excluding internal team handles)
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
            WHERE ${AFFILIATE_EXTERNAL_FILTER_SQL}
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

        // Top External Affiliates (excluding internal team handles)
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
            WHERE ${AFFILIATE_EXTERNAL_FILTER_SQL}
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
        let tiktokOrdersCount = 0;
        let shopeeOrdersCount = 0;
        let tiktokUnitsSold = 0;
        let shopeeUnitsSold = 0;

        for (const row of ordersSummaryRes.rows) {
            totalOrdersCount += row.order_count;
            totalUnitsSold += row.total_quantity;
            const mp = (row.marketplace || '').toLowerCase();
            if (mp.includes('tiktok')) {
                tiktokOrdersCount += row.order_count;
                tiktokUnitsSold += row.total_quantity;
            } else if (mp.includes('shopee')) {
                shopeeOrdersCount += row.order_count;
                shopeeUnitsSold += row.total_quantity;
            }
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
                totalUnitsSold,
                tiktokOrdersCount,
                shopeeOrdersCount,
                tiktokUnitsSold,
                shopeeUnitsSold
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

// -------------------------------------------------------------
// 5. MULTI-MONTH TRENDS (TARGET VS ACTUAL PATTERN)
// -------------------------------------------------------------
const MONTH_LABELS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];

async function fetchRealitySalesTrends(year: number, currentYear: number, currentMonth: number) {
    // 1. Configured targets across months
    const targetsByMonth = await getHistoricalDepartmentTargets(year);

    // 2. Overall Actuals (HIM Wellness only)
    const overallActualsMap: Record<string, number> = {};
    try {
        const shopeeRes = await localPool.query(`
            SELECT TO_CHAR(date, 'YYYY-MM') as month_key, COALESCE(SUM(gmv), 0)::float as gmv
            FROM credentials.daily_shopee_metrics
            WHERE EXTRACT(YEAR FROM date) = $1
              AND shop_id = ANY(ARRAY[${SHOPEE_HIM_IDS.join(',')}]::bigint[])
            GROUP BY month_key;
        `, [year]);
        for (const r of shopeeRes.rows) {
            overallActualsMap[r.month_key] = (overallActualsMap[r.month_key] || 0) + (parseFloat(r.gmv) || 0);
        }

        const tiktokRes = await localPool.query(`
            SELECT TO_CHAR(date, 'YYYY-MM') as month_key, COALESCE(SUM(gmv), 0)::float as gmv
            FROM credentials.daily_shop_metrics
            WHERE EXTRACT(YEAR FROM date) = $1
              AND shop_number = ANY(ARRAY[${TIKTOK_HIM_NUMBERS.join(',')}]::int[])
            GROUP BY month_key;
        `, [year]);
        for (const r of tiktokRes.rows) {
            overallActualsMap[r.month_key] = (overallActualsMap[r.month_key] || 0) + (parseFloat(r.gmv) || 0);
        }
    } catch (err) {
        console.error('[reality-sales] Trends error fetching overall metrics:', err);
    }

    // 3. Creative Actuals (Marketing Video GMV) - Primary: Google Sheets, Fallback: Postgres
    const creativeActualsMap: Record<string, number> = {};
    try {
        const sheetTrends = await fetchMarketingMonthlyTrendsFromSheets(year);
        if (sheetTrends && Object.keys(sheetTrends).length > 0) {
            Object.assign(creativeActualsMap, sheetTrends);
        }
    } catch (e: any) {
        console.warn('[reality-sales] Google Sheets trends fetch failed, checking Postgres:', e.message);
    }

    if (Object.keys(creativeActualsMap).length === 0 && mktPool) {
        try {
            const mktRes = await mktPool.query(`
                SELECT 
                    SUBSTRING(il."dataDate" FROM 1 FOR 7) as month_key,
                    COALESCE(SUM(vr."directGmv"), 0)::float as gmv
                FROM "VideoRecord" vr
                JOIN "ImportLog" il ON vr."importLogId" = il.id
                WHERE LOWER(vr."creatorName") IN (SELECT LOWER(handle) FROM "InternalHandle")
                  AND SUBSTRING(il."dataDate" FROM 1 FOR 4) = $1
                GROUP BY month_key;
            `, [String(year)]);
            for (const r of mktRes.rows) {
                creativeActualsMap[r.month_key] = parseFloat(r.gmv) || 0;
            }
        } catch (err) {
            console.error('[reality-sales] Trends error querying marketing DB:', err);
        }
    }

    // 4. Livehost Actuals
    const liveActualsMap: Record<string, number> = {};
    if (livePool) {
        try {
            const liveRes = await livePool.query(`
                SELECT 
                    TO_CHAR(COALESCE(s.date, sr."submittedAt"), 'YYYY-MM') as month_key,
                    COALESCE(SUM(sr."directGmv"), 0)::float as gmv
                FROM "SessionReport" sr
                JOIN "Shift" s ON sr."shiftId" = s.id
                WHERE EXTRACT(YEAR FROM COALESCE(s.date, sr."submittedAt")) = $1
                GROUP BY month_key;
            `, [year]);
            for (const r of liveRes.rows) {
                liveActualsMap[r.month_key] = parseFloat(r.gmv) || 0;
            }
        } catch (err) {
            console.error('[reality-sales] Trends error querying livehost DB:', err);
        }
    }

    // 5. Affiliate Actuals (External only, excluding internal team handles)
    const affiliateActualsMap: Record<string, number> = {};
    if (affPool) {
        try {
            const affRes = await affPool.query(`
                SELECT 
                    TO_CHAR(report_date, 'YYYY-MM') as month_key,
                    COALESCE(SUM(total_gmv::numeric), 0)::float as gmv
                FROM affiliate_records
                WHERE ${AFFILIATE_EXTERNAL_FILTER_SQL}
                  AND EXTRACT(YEAR FROM report_date) = $1
                GROUP BY month_key;
            `, [year]);
            for (const r of affRes.rows) {
                affiliateActualsMap[r.month_key] = parseFloat(r.gmv) || 0;
            }
        } catch (err) {
            console.error('[reality-sales] Trends error querying affiliate DB:', err);
        }
    }

    // Build trend list
    const maxMonth = year < currentYear ? 12 : Math.min(12, currentMonth);
    const monthlyTrends = [];

    const summary = {
        overall: { target: 0, actual: 0 },
        creative: { target: 0, actual: 0 },
        livehost: { target: 0, actual: 0 },
        affiliate: { target: 0, actual: 0 }
    };

    for (let monthNum = 1; monthNum <= maxMonth; monthNum++) {
        const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
        const monthLabel = `${MONTH_LABELS[monthNum - 1]} ${year}`;
        const targets = targetsByMonth[monthKey] || {
            overall: 4000000,
            marketing: 200000,
            livehost: 300000,
            affiliate: 350000
        };

        const overallActual = overallActualsMap[monthKey] || 0;
        const creativeActual = creativeActualsMap[monthKey] || 0;
        const liveActual = liveActualsMap[monthKey] || 0;
        const affActual = affiliateActualsMap[monthKey] || 0;

        const overallTarget = targets.overall;
        const creativeTarget = targets.marketing;
        const liveTarget = targets.livehost;
        const affTarget = targets.affiliate;

        summary.overall.target += overallTarget;
        summary.overall.actual += overallActual;

        summary.creative.target += creativeTarget;
        summary.creative.actual += creativeActual;

        summary.livehost.target += liveTarget;
        summary.livehost.actual += liveActual;

        summary.affiliate.target += affTarget;
        summary.affiliate.actual += affActual;

        monthlyTrends.push({
            monthKey,
            monthNum,
            monthLabel,
            overall: {
                target: overallTarget,
                actual: overallActual,
                attainmentRate: overallTarget > 0 ? (overallActual / overallTarget) * 100 : 0,
                variance: overallActual - overallTarget
            },
            creative: {
                target: creativeTarget,
                actual: creativeActual,
                attainmentRate: creativeTarget > 0 ? (creativeActual / creativeTarget) * 100 : 0,
                variance: creativeActual - creativeTarget
            },
            livehost: {
                target: liveTarget,
                actual: liveActual,
                attainmentRate: liveTarget > 0 ? (liveActual / liveTarget) * 100 : 0,
                variance: liveActual - liveTarget
            },
            affiliate: {
                target: affTarget,
                actual: affActual,
                attainmentRate: affTarget > 0 ? (affActual / affTarget) * 100 : 0,
                variance: affActual - affTarget
            }
        });
    }

    const formatSummaryItem = (item: { target: number; actual: number }) => ({
        totalTarget: item.target,
        totalActual: item.actual,
        attainmentRate: item.target > 0 ? (item.actual / item.target) * 100 : 0,
        variance: item.actual - item.target
    });

    return {
        success: true,
        year,
        currentMonth,
        maxMonth,
        trends: monthlyTrends,
        ytdSummary: {
            overall: formatSummaryItem(summary.overall),
            creative: formatSummaryItem(summary.creative),
            livehost: formatSummaryItem(summary.livehost),
            affiliate: formatSummaryItem(summary.affiliate)
        }
    };
}
