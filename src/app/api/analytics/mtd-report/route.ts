import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// Shop ID mappings
// Shopee: HIM = 562396517, 1077500606, 1256177782, 1285322524, 1290223366, 1298030530
//         Weroca = 793855746, 1245549673
// TikTok: HIM = shop_number 1 (Himclinic, DrSamhanWellness, HIM CLINIC)
//         Weroca = shop_number 3, 4 (Vigomax HQ, VigomaxPlus HQ)

const SHOPEE_HIM_IDS = [1077500606, 1256177782, 1285322524, 1290223366, 1298030530];
const SHOPEE_WEROCA_IDS = [562396517, 793855746, 1245549673];
const TIKTOK_HIM_NUMBERS = [1, 2];
const TIKTOK_WEROCA_NUMBERS = [3, 4];

function buildShopeeFilter(companyFilter: string): string {
    if (companyFilter === 'HIMWELLNESS') return `AND shop_id = ANY(ARRAY[${SHOPEE_HIM_IDS.join(',')}]::bigint[])`;
    if (companyFilter === 'WEROCA') return `AND shop_id = ANY(ARRAY[${SHOPEE_WEROCA_IDS.join(',')}]::bigint[])`;
    return '';
}

function buildTiktokFilter(companyFilter: string): string {
    if (companyFilter === 'HIMWELLNESS') return `AND shop_number = ANY(ARRAY[${TIKTOK_HIM_NUMBERS.join(',')}]::int[])`;
    if (companyFilter === 'WEROCA') return `AND shop_number = ANY(ARRAY[${TIKTOK_WEROCA_NUMBERS.join(',')}]::int[])`;
    return '';
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const targetMonth = searchParams.get('targetMonth') || '2026-06'; // YYYY-MM
        const dayRangeEndParam = searchParams.get('dayRangeEnd') || '10';
        const dayRangeEnd = parseInt(dayRangeEndParam, 10) || 10;
        const companyFilter = (searchParams.get('companyFilter') || 'ALL').toUpperCase();

        const shopeeWhere = buildShopeeFilter(companyFilter);
        const tiktokWhere = buildTiktokFilter(companyFilter);

        // Extract year and month
        const [yearStr, monthStr] = targetMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // Fetch current target month MTD data (from Day 1 to dayRangeEnd)
        // Marketplace (Shopee) metrics
        const shopeeCurRes = await query(`
            SELECT COALESCE(SUM(gmv), 0)::float as sales, COALESCE(SUM(spend_before_tax), 0)::float as spend
            FROM credentials.daily_shopee_metrics
            WHERE EXTRACT(YEAR FROM date) = $1 
              AND EXTRACT(MONTH FROM date) = $2
              AND EXTRACT(DAY FROM date) >= 1 
              AND EXTRACT(DAY FROM date) <= $3
              ${shopeeWhere}
        `, [year, month, dayRangeEnd]);

        // Ecommerce (TikTok Shop) metrics
        const tiktokCurRes = await query(`
            SELECT COALESCE(SUM(gmv), 0)::float as sales, COALESCE(SUM(spend_before_tax), 0)::float as spend
            FROM credentials.daily_shop_metrics
            WHERE EXTRACT(YEAR FROM date) = $1 
              AND EXTRACT(MONTH FROM date) = $2
              AND EXTRACT(DAY FROM date) >= 1 
              AND EXTRACT(DAY FROM date) <= $3
              ${tiktokWhere}
        `, [year, month, dayRangeEnd]);

        // Fetch preceding months' MTD data dynamically
        const historicalMonths = [
            { label: 'DEC 2025', year: 2025, month: 12 },
            { label: 'JAN 2026', year: 2026, month: 1 },
            { label: 'FEB 2026', year: 2026, month: 2 },
            { label: 'MAC 2026', year: 2026, month: 3 },
            { label: 'APR 2026', year: 2026, month: 4 },
            { label: 'MEI 2026', year: 2026, month: 5 },
            { label: 'JUN 2026', year: 2026, month: 6 }
        ];

        const monthlyTrend = [];

        for (const m of historicalMonths) {
            // Aggregate Shopee
            const shopeeRes = await query(`
                SELECT COALESCE(SUM(gmv), 0)::float as sales, COALESCE(SUM(spend_before_tax), 0)::float as spend
                FROM credentials.daily_shopee_metrics
                WHERE EXTRACT(YEAR FROM date) = $1 
                  AND EXTRACT(MONTH FROM date) = $2
                  AND EXTRACT(DAY FROM date) >= 1 
                  AND EXTRACT(DAY FROM date) <= $3
                  ${shopeeWhere}
            `, [m.year, m.month, dayRangeEnd]);

            // Aggregate TikTok
            const tiktokRes = await query(`
                SELECT COALESCE(SUM(gmv), 0)::float as sales, COALESCE(SUM(spend_before_tax), 0)::float as spend
                FROM credentials.daily_shop_metrics
                WHERE EXTRACT(YEAR FROM date) = $1 
                  AND EXTRACT(MONTH FROM date) = $2
                  AND EXTRACT(DAY FROM date) >= 1 
                  AND EXTRACT(DAY FROM date) <= $3
                  ${tiktokWhere}
            `, [m.year, m.month, dayRangeEnd]);

            const shopeeSales = shopeeRes.rows[0]?.sales || 0;
            const shopeeSpend = shopeeRes.rows[0]?.spend || 0;
            const tiktokSales = tiktokRes.rows[0]?.sales || 0;
            const tiktokSpend = tiktokRes.rows[0]?.spend || 0;

            const totalSales = shopeeSales + tiktokSales;
            const totalSpend = shopeeSpend + tiktokSpend;
            const roas = totalSpend > 0 ? totalSales / totalSpend : 0;

            monthlyTrend.push({
                monthLabel: m.label,
                monthKey: `${m.year}-${String(m.month).padStart(2, '0')}`,
                shopee: { sales: shopeeSales, spend: shopeeSpend },
                tiktok: { sales: tiktokSales, spend: tiktokSpend },
                totalSales,
                totalSpend,
                roas
            });
        }

        // Active Month Metrics Summary
        const curShopeeSales = shopeeCurRes.rows[0]?.sales || 0;
        const curShopeeSpend = shopeeCurRes.rows[0]?.spend || 0;
        const curTiktokSales = tiktokCurRes.rows[0]?.sales || 0;
        const curTiktokSpend = tiktokCurRes.rows[0]?.spend || 0;

        const currentMonthData = {
            shopee: {
                sales: curShopeeSales,
                spend: curShopeeSpend,
                roas: curShopeeSpend > 0 ? curShopeeSales / curShopeeSpend : 0
            },
            tiktok: {
                sales: curTiktokSales,
                spend: curTiktokSpend,
                roas: curTiktokSpend > 0 ? curTiktokSales / curTiktokSpend : 0
            },
            total: {
                sales: curShopeeSales + curTiktokSales,
                spend: curShopeeSpend + curTiktokSpend,
                roas: (curShopeeSpend + curTiktokSpend) > 0 ? (curShopeeSales + curTiktokSales) / (curShopeeSpend + curTiktokSpend) : 0
            }
        };

        // Compute Comparison Data
        const activeMonthKey = `${year}-${String(month).padStart(2, '0')}`;
        const activeMonthDetails = monthlyTrend.find(m => m.monthKey === activeMonthKey) || {
            shopee: { sales: curShopeeSales, spend: curShopeeSpend },
            tiktok: { sales: curTiktokSales, spend: curTiktokSpend },
            totalSales: curShopeeSales + curTiktokSales,
            totalSpend: curShopeeSpend + curTiktokSpend,
            roas: (curShopeeSpend + curTiktokSpend) > 0 ? (curShopeeSales + curTiktokSales) / (curShopeeSpend + curTiktokSpend) : 0
        };

        const comparisons = monthlyTrend
            .filter(m => m.monthKey !== activeMonthKey)
            .map(m => {
                // Marketplace Deltas
                const shopeeSalesDelta = activeMonthDetails.shopee.sales - m.shopee.sales;
                const shopeeSalesPct = m.shopee.sales > 0 ? (shopeeSalesDelta / m.shopee.sales) * 100 : 0;
                const shopeeRoasActive = activeMonthDetails.shopee.spend > 0 ? activeMonthDetails.shopee.sales / activeMonthDetails.shopee.spend : 0;
                const shopeeRoasPrev = m.shopee.spend > 0 ? m.shopee.sales / m.shopee.spend : 0;
                const shopeeRoasDelta = shopeeRoasActive - shopeeRoasPrev;

                // Ecommerce Deltas
                const tiktokSalesDelta = activeMonthDetails.tiktok.sales - m.tiktok.sales;
                const tiktokSalesPct = m.tiktok.sales > 0 ? (tiktokSalesDelta / m.tiktok.sales) * 100 : 0;
                const tiktokRoasActive = activeMonthDetails.tiktok.spend > 0 ? activeMonthDetails.tiktok.sales / activeMonthDetails.tiktok.spend : 0;
                const tiktokRoasPrev = m.tiktok.spend > 0 ? m.tiktok.sales / m.tiktok.spend : 0;
                const tiktokRoasDelta = tiktokRoasActive - tiktokRoasPrev;

                // Total Deltas
                const totalSalesDelta = activeMonthDetails.totalSales - m.totalSales;
                const totalSalesPct = m.totalSales > 0 ? (totalSalesDelta / m.totalSales) * 100 : 0;
                const totalRoasActive = activeMonthDetails.totalSpend > 0 ? activeMonthDetails.totalSales / activeMonthDetails.totalSpend : 0;
                const totalRoasPrev = m.totalSpend > 0 ? m.totalSales / m.totalSpend : 0;
                const totalRoasDelta = totalRoasActive - totalRoasPrev;

                return {
                    comparisonMonth: m.monthLabel,
                    shopee: {
                        active: { sales: activeMonthDetails.shopee.sales, spend: activeMonthDetails.shopee.spend, roas: shopeeRoasActive },
                        prev: { sales: m.shopee.sales, spend: m.shopee.spend, roas: shopeeRoasPrev },
                        deltaSales: shopeeSalesDelta,
                        deltaSalesPct: shopeeSalesPct,
                        deltaRoas: shopeeRoasDelta
                    },
                    tiktok: {
                        active: { sales: activeMonthDetails.tiktok.sales, spend: activeMonthDetails.tiktok.spend, roas: tiktokRoasActive },
                        prev: { sales: m.tiktok.sales, spend: m.tiktok.spend, roas: tiktokRoasPrev },
                        deltaSales: tiktokSalesDelta,
                        deltaSalesPct: tiktokSalesPct,
                        deltaRoas: tiktokRoasDelta
                    },
                    total: {
                        active: { sales: activeMonthDetails.totalSales, spend: activeMonthDetails.totalSpend, roas: totalRoasActive },
                        prev: { sales: m.totalSales, spend: m.totalSpend, roas: totalRoasPrev },
                        deltaSales: totalSalesDelta,
                        deltaSalesPct: totalSalesPct,
                        deltaRoas: totalRoasDelta
                    }
                };
            });

        return NextResponse.json({
            currentMonthData,
            monthlyTrend,
            comparisons,
            dayRangeEnd
        });

    } catch (e: any) {
        console.error('[mtd-report] API error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
