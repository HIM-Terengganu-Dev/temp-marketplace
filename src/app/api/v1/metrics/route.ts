import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateApiKey } from '@/lib/api-key-auth';

export const dynamic = 'force-dynamic';

const SHOPEE_HIM_IDS = [1077500606, 1256177782, 1285322524, 1290223366, 1298030530];
const SHOPEE_WEROCA_IDS = [562396517, 793855746, 1245549673];
const TIKTOK_HIM_NUMBERS = [1, 2];
const TIKTOK_WEROCA_NUMBERS = [3, 4];

interface MetricItem {
    date: string;
    platform: 'tiktok' | 'shopee';
    company: 'HIMWELLNESS' | 'WEROCA';
    shop_id: number | string;
    shop_name: string;
    sales: number;
    ad_cost: number;
    ad_cost_after_tax: number;
    orders: number;
    roas: number;
    cancelled_sales: number;
    cancelled_orders: number;
}

function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

export async function GET(request: Request) {
    // 1. API Key Authentication (supports ENV & DB table)
    const authResult = await validateApiKey(request);
    if (!authResult.isValid || authResult.errorResponse) {
        return authResult.errorResponse;
    }

    try {
        const { searchParams } = new URL(request.url);

        const startDate = searchParams.get('startDate') || todayKL();
        const endDate = searchParams.get('endDate') || startDate;
        let requestedCompany = (searchParams.get('company') || 'ALL').toUpperCase();
        const platform = (searchParams.get('platform') || 'all').toLowerCase();
        const groupBy = (searchParams.get('groupBy') || 'daily').toLowerCase();

        // Enforce key permission boundaries if key is scoped to a single company
        if (authResult.companyAccess !== 'ALL') {
            if (requestedCompany !== 'ALL' && requestedCompany !== authResult.companyAccess) {
                return NextResponse.json(
                    { success: false, error: `Forbidden: This API key is restricted to ${authResult.companyAccess} metrics only.` },
                    { status: 403 }
                );
            }
            requestedCompany = authResult.companyAccess;
        }

        // Validate date format YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return NextResponse.json(
                { success: false, error: 'Invalid date format. Use YYYY-MM-DD (e.g. 2026-11-01)' },
                { status: 400 }
            );
        }

        // Determine shops to include
        let targetTiktokShops: number[] = [];
        let targetShopeeIds: number[] = [];

        if (requestedCompany === 'HIMWELLNESS') {
            targetTiktokShops = TIKTOK_HIM_NUMBERS;
            targetShopeeIds = SHOPEE_HIM_IDS;
        } else if (requestedCompany === 'WEROCA') {
            targetTiktokShops = TIKTOK_WEROCA_NUMBERS;
            targetShopeeIds = SHOPEE_WEROCA_IDS;
        } else {
            // ALL
            targetTiktokShops = [...TIKTOK_HIM_NUMBERS, ...TIKTOK_WEROCA_NUMBERS];
            targetShopeeIds = [...SHOPEE_HIM_IDS, ...SHOPEE_WEROCA_IDS];
        }

        const includeTiktok = platform === 'all' || platform === 'tiktok';
        const includeShopee = platform === 'all' || platform === 'shopee';

        const queries: Promise<any>[] = [];

        // 2. Query TikTok Metrics
        if (includeTiktok && targetTiktokShops.length > 0) {
            queries.push(
                query(`
                    SELECT 
                        to_char(date, 'YYYY-MM-DD') as date,
                        shop_number,
                        shop_name,
                        COALESCE(gmv, 0)::float as sales,
                        COALESCE(spend_before_tax, 0)::float as ad_cost,
                        COALESCE(spend_after_tax, 0)::float as ad_cost_after_tax,
                        COALESCE(order_count, 0)::int as orders,
                        COALESCE(cancelled_order_count, 0)::int as cancelled_orders,
                        COALESCE(cancelled_gmv, 0)::float as cancelled_sales,
                        COALESCE(visitors, 0)::int as visitors,
                        COALESCE(impressions, 0)::int as impressions
                    FROM credentials.daily_shop_metrics
                    WHERE date >= $1 AND date <= $2
                      AND shop_number = ANY($3::int[])
                    ORDER BY date DESC, shop_number ASC
                `, [startDate, endDate, targetTiktokShops])
            );
        } else {
            queries.push(Promise.resolve({ rows: [] }));
        }

        // 3. Query Shopee Metrics
        if (includeShopee && targetShopeeIds.length > 0) {
            queries.push(
                query(`
                    SELECT 
                        to_char(date, 'YYYY-MM-DD') as date,
                        shop_id,
                        shop_name,
                        COALESCE(gmv, 0)::float as sales,
                        COALESCE(spend_before_tax, 0)::float as ad_cost,
                        COALESCE(spend_after_tax, 0)::float as ad_cost_after_tax,
                        COALESCE(order_count, 0)::int as orders,
                        COALESCE(cancelled_order_count, 0)::int as cancelled_orders,
                        COALESCE(cancelled_gmv, 0)::float as cancelled_sales,
                        COALESCE(cpas_spend, 0)::float as cpas_spend,
                        COALESCE(shopee_cpc_spend, 0)::float as shopee_cpc_spend
                    FROM credentials.daily_shopee_metrics
                    WHERE date >= $1 AND date <= $2
                      AND shop_id = ANY($3::bigint[])
                    ORDER BY date DESC, shop_id ASC
                `, [startDate, endDate, targetShopeeIds])
            );
        } else {
            queries.push(Promise.resolve({ rows: [] }));
        }

        const [tiktokRes, shopeeRes] = await Promise.all(queries);

        // 4. Transform TikTok rows
        const tiktokItems: MetricItem[] = (tiktokRes.rows || []).map((row: any) => {
            const comp: 'HIMWELLNESS' | 'WEROCA' = TIKTOK_HIM_NUMBERS.includes(Number(row.shop_number)) ? 'HIMWELLNESS' : 'WEROCA';
            const sales = Math.round(Number(row.sales) * 100) / 100;
            const adCost = Math.round(Number(row.ad_cost) * 100) / 100;
            const orders = Number(row.orders) || 0;
            const roas = adCost > 0 ? Math.round((sales / adCost) * 100) / 100 : 0;

            return {
                date: row.date,
                platform: 'tiktok' as const,
                company: comp,
                shop_id: row.shop_number,
                shop_name: row.shop_name,
                sales,
                ad_cost: adCost,
                ad_cost_after_tax: Math.round(Number(row.ad_cost_after_tax) * 100) / 100,
                orders,
                roas,
                cancelled_sales: Math.round(Number(row.cancelled_sales) * 100) / 100,
                cancelled_orders: Number(row.cancelled_orders) || 0,
            };
        });

        // 5. Transform Shopee rows
        const shopeeItems: MetricItem[] = (shopeeRes.rows || []).map((row: any) => {
            const comp: 'HIMWELLNESS' | 'WEROCA' = SHOPEE_HIM_IDS.includes(Number(row.shop_id)) ? 'HIMWELLNESS' : 'WEROCA';
            const sales = Math.round(Number(row.sales) * 100) / 100;
            const adCost = Math.round(Number(row.ad_cost) * 100) / 100;
            const orders = Number(row.orders) || 0;
            const roas = adCost > 0 ? Math.round((sales / adCost) * 100) / 100 : 0;

            return {
                date: row.date,
                platform: 'shopee' as const,
                company: comp,
                shop_id: row.shop_id,
                shop_name: row.shop_name,
                sales,
                ad_cost: adCost,
                ad_cost_after_tax: Math.round(Number(row.ad_cost_after_tax) * 100) / 100,
                orders,
                roas,
                cancelled_sales: Math.round(Number(row.cancelled_sales) * 100) / 100,
                cancelled_orders: Number(row.cancelled_orders) || 0,
            };
        });

        const allItems = [...tiktokItems, ...shopeeItems].sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.platform.localeCompare(b.platform);
        });

        // 6. Calculate Totals
        const totalSales = Math.round(allItems.reduce((acc: number, cur: MetricItem) => acc + cur.sales, 0) * 100) / 100;
        const totalAdCost = Math.round(allItems.reduce((acc: number, cur: MetricItem) => acc + cur.ad_cost, 0) * 100) / 100;
        const totalOrders = allItems.reduce((acc: number, cur: MetricItem) => acc + cur.orders, 0);
        const blendedRoas = totalAdCost > 0 ? Math.round((totalSales / totalAdCost) * 100) / 100 : 0;

        const tiktokSales = Math.round(tiktokItems.reduce((acc: number, cur: MetricItem) => acc + cur.sales, 0) * 100) / 100;
        const tiktokAdCost = Math.round(tiktokItems.reduce((acc: number, cur: MetricItem) => acc + cur.ad_cost, 0) * 100) / 100;
        const tiktokOrders = tiktokItems.reduce((acc: number, cur: MetricItem) => acc + cur.orders, 0);

        const shopeeSales = Math.round(shopeeItems.reduce((acc: number, cur: MetricItem) => acc + cur.sales, 0) * 100) / 100;
        const shopeeAdCost = Math.round(shopeeItems.reduce((acc: number, cur: MetricItem) => acc + cur.ad_cost, 0) * 100) / 100;
        const shopeeOrders = shopeeItems.reduce((acc: number, cur: MetricItem) => acc + cur.orders, 0);

        const summary = {
            total_sales: totalSales,
            total_ad_cost: totalAdCost,
            total_orders: totalOrders,
            blended_roas: blendedRoas,
            by_platform: {
                tiktok: {
                    sales: tiktokSales,
                    ad_cost: tiktokAdCost,
                    orders: tiktokOrders,
                    roas: tiktokAdCost > 0 ? Math.round((tiktokSales / tiktokAdCost) * 100) / 100 : 0,
                },
                shopee: {
                    sales: shopeeSales,
                    ad_cost: shopeeAdCost,
                    orders: shopeeOrders,
                    roas: shopeeAdCost > 0 ? Math.round((shopeeSales / shopeeAdCost) * 100) / 100 : 0,
                }
            }
        };

        return NextResponse.json({
            success: true,
            authenticated_as: authResult.keyName,
            filter: {
                startDate,
                endDate,
                company: requestedCompany,
                platform,
                groupBy
            },
            summary,
            ...(groupBy === 'daily' ? { data: allItems } : {})
        });

    } catch (error: any) {
        console.error('[api/v1/metrics] Error fetching metrics:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
