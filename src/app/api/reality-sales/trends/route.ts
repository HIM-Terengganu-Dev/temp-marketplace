import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { query as localQuery } from '@/lib/db';
import { getHistoricalDepartmentTargets } from '@/lib/department-targets';

if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

export const dynamic = 'force-dynamic';

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const [curYStr, curMStr] = todayKL.split('-');
        const currentYear = parseInt(curYStr, 10) || 2026;
        const currentMonth = parseInt(curMStr, 10) || 7;

        const year = parseInt(searchParams.get('year') || String(currentYear), 10);

        // 1. Fetch configured targets for all months in this year
        const targetsByMonth = await getHistoricalDepartmentTargets(year);

        // 2. Fetch Overall Actuals (Shopee & TikTok)
        const overallActualsMap: Record<string, number> = {};
        try {
            const shopeeRes = await localQuery(`
                SELECT TO_CHAR(date, 'YYYY-MM') as month_key, COALESCE(SUM(gmv), 0)::float as gmv
                FROM credentials.daily_shopee_metrics
                WHERE EXTRACT(YEAR FROM date) = $1
                GROUP BY month_key;
            `, [year]);
            for (const r of shopeeRes.rows) {
                overallActualsMap[r.month_key] = (overallActualsMap[r.month_key] || 0) + (parseFloat(r.gmv) || 0);
            }

            const tiktokRes = await localQuery(`
                SELECT TO_CHAR(date, 'YYYY-MM') as month_key, COALESCE(SUM(gmv), 0)::float as gmv
                FROM credentials.daily_shop_metrics
                WHERE EXTRACT(YEAR FROM date) = $1
                GROUP BY month_key;
            `, [year]);
            for (const r of tiktokRes.rows) {
                overallActualsMap[r.month_key] = (overallActualsMap[r.month_key] || 0) + (parseFloat(r.gmv) || 0);
            }
        } catch (err) {
            console.error('[reality-sales/trends] Error fetching overall metrics:', err);
        }

        // 3. Fetch Creative (Marketing) Actuals
        const creativeActualsMap: Record<string, number> = {};
        if (mktPool) {
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
                console.error('[reality-sales/trends] Error querying marketing DB:', err);
            }
        }

        // 4. Fetch Livehost Actuals
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
                console.error('[reality-sales/trends] Error querying livehost DB:', err);
            }
        }

        // 5. Fetch Affiliate Actuals
        const affiliateActualsMap: Record<string, number> = {};
        if (affPool) {
            try {
                const affRes = await affPool.query(`
                    SELECT 
                        TO_CHAR(report_date, 'YYYY-MM') as month_key,
                        COALESCE(SUM(total_gmv::numeric), 0)::float as gmv
                    FROM affiliate_records
                    WHERE channel = 'External'
                      AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
                      AND EXTRACT(YEAR FROM report_date) = $1
                    GROUP BY month_key;
                `, [year]);
                for (const r of affRes.rows) {
                    affiliateActualsMap[r.month_key] = parseFloat(r.gmv) || 0;
                }
            } catch (err) {
                console.error('[reality-sales/trends] Error querying affiliate DB:', err);
            }
        }

        // 6. Build Month-by-Month trend data up to latest active month (or all 12 if historical year)
        const maxMonth = year < currentYear ? 12 : Math.min(12, currentMonth);
        const monthlyTrends = [];

        // Accumulators for YTD summary
        const summary = {
            overall: { target: 0, actual: 0 },
            creative: { target: 0, actual: 0 },
            livehost: { target: 0, actual: 0 },
            affiliate: { target: 0, actual: 0 }
        };

        for (let m = 1; m <= maxMonth; m++) {
            const monthKey = `${year}-${String(m).padStart(2, '0')}`;
            const monthLabel = `${MONTH_LABELS[m - 1]} ${year}`;
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
                monthNum: m,
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

        return NextResponse.json({
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
        });
    } catch (err: any) {
        console.error('[reality-sales/trends] Fatal error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch trends' }, { status: 500 });
    }
}
