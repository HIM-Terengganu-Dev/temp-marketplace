import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getConnectedShopeeShops, fetchShopeeShopPerformance } from '@/lib/shopee-client';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

function getKLToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function getPreviousPeriod(startStr: string, endStr: string) {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const daySpan = differenceInDays(end, start) + 1;

    const prevStart = subDays(start, daySpan);
    const prevEnd = subDays(start, 1);

    return {
        start: format(prevStart, 'yyyy-MM-dd'),
        end: format(prevEnd, 'yyyy-MM-dd')
    };
}

function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    while (curr <= end) {
        const y = curr.getUTCFullYear();
        const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const d = String(curr.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const today = getKLToday();
        const startDate = searchParams.get('startDate') || today;
        const endDate = searchParams.get('endDate') || today;
        const requestedShopId = searchParams.get('shopId'); // "all" or specific shopId

        // Get allowed shops from session
        const allConnectedShops = await getConnectedShopeeShops();
        const allowedShopeeShops = (session.user as any)?.allowed_shopee_shops || [];
        const hasRealIds = allowedShopeeShops.some((id: number) => id > 1000);

        let authorizedShops = allConnectedShops.filter((s: any) => {
            if (!hasRealIds) return true;
            return allowedShopeeShops.includes(parseInt(s.shop_id, 10));
        });

        if (requestedShopId && requestedShopId !== 'all') {
            const targetId = parseInt(requestedShopId, 10);
            authorizedShops = authorizedShops.filter((s: any) => parseInt(s.shop_id, 10) === targetId);
        }

        if (authorizedShops.length === 0) {
            return NextResponse.json({
                summary: getZeroSummary(),
                prevSummary: getZeroSummary(),
                changes: { gmv: 0, spend: 0, roas: 0, orders: 0 },
                shopsBreakdown: [],
                trends: [],
                dateRange: { start: startDate, end: endDate }
            });
        }

        const shopIds = authorizedShops.map((s: any) => parseInt(s.shop_id, 10));
        const prevRange = getPreviousPeriod(startDate, endDate);

        // Query current and previous period from DB
        const [currentDbResult, prevDbResult] = await Promise.all([
            query(`
                SELECT 
                    TO_CHAR(date, 'YYYY-MM-DD') AS date, 
                    shop_id, 
                    shop_name, 
                    gmv, 
                    spend_before_tax, 
                    spend_after_tax, 
                    order_count, 
                    cpas_spend, 
                    shopee_cpc_spend, 
                    ad_impressions, 
                    ad_clicks, 
                    ad_orders, 
                    ad_sales,
                    updated_at
                FROM credentials.daily_shopee_metrics
                WHERE shop_id = ANY($1::bigint[]) AND date >= $2::date AND date <= $3::date
                ORDER BY date ASC
            `, [shopIds, startDate, endDate]),
            query(`
                SELECT 
                    shop_id, 
                    COALESCE(SUM(gmv), 0) AS total_gmv,
                    COALESCE(SUM(spend_before_tax), 0) AS total_spend,
                    COALESCE(SUM(spend_after_tax), 0) AS total_spend_after_tax,
                    COALESCE(SUM(order_count), 0) AS total_orders,
                    COALESCE(SUM(cpas_spend), 0) AS total_cpas_spend,
                    COALESCE(SUM(shopee_cpc_spend), 0) AS total_shopee_cpc_spend
                FROM credentials.daily_shopee_metrics
                WHERE shop_id = ANY($1::bigint[]) AND date >= $2::date AND date <= $3::date
                GROUP BY shop_id
            `, [shopIds, prevRange.start, prevRange.end])
        ]);

        // Background / live revalidation for today or missing dates
        const dates = generateDateRange(startDate, endDate);
        const isQueryingToday = dates.includes(today);
        const dbRows = currentDbResult.rows;

        // Check if today data is fresh or missing for any authorized shop
        const syncPromises: Promise<any>[] = [];
        if (isQueryingToday) {
            const FIVE_MIN_MS = 5 * 60 * 1000;
            const now = Date.now();

            for (const shop of authorizedShops) {
                const sId = parseInt(shop.shop_id, 10);
                const todayRow = dbRows.find(r => r.shop_id === sId && r.date === today);
                const isStale = !todayRow || !todayRow.updated_at || (now - new Date(todayRow.updated_at).getTime()) > FIVE_MIN_MS;

                if (isStale) {
                    syncPromises.push(
                        fetchShopeeShopPerformance(sId, today, today).catch(e => {
                            console.warn(`[shopee-dashboard-api] Error refreshing shop ${sId}:`, e.message);
                            return null;
                        })
                    );
                }
            }
        }

        // Await fresh sync if today was completely missing
        if (syncPromises.length > 0) {
            const freshResults = await Promise.all(syncPromises);
            for (const res of freshResults) {
                if (!res) continue;
                const existingIdx = dbRows.findIndex(r => r.shop_id === res.shopId && r.date === today);
                const updatedRow = {
                    date: today,
                    shop_id: res.shopId,
                    shop_name: res.shopName,
                    gmv: res.gmv,
                    spend_before_tax: res.spendBeforeTax,
                    spend_after_tax: res.spendAfterTax,
                    order_count: res.orderCount,
                    cpas_spend: res.cpasSpend,
                    shopee_cpc_spend: res.shopeeCpcSpend,
                    ad_impressions: res.adImpressions,
                    ad_clicks: res.adClicks,
                    ad_orders: res.adOrders,
                    ad_sales: res.adSales,
                    updated_at: new Date().toISOString()
                };
                if (existingIdx >= 0) {
                    dbRows[existingIdx] = updatedRow;
                } else {
                    dbRows.push(updatedRow);
                }
            }
        }

        // Aggregate current period data
        let totalGmv = 0;
        let totalOrders = 0;
        let totalShopeeSpend = 0;
        let totalMetaSpend = 0;
        let totalAdImpressions = 0;
        let totalAdClicks = 0;
        let totalAdOrders = 0;
        let totalAdSales = 0;

        // Group by shop
        const shopAggMap: Record<number, {
            shopId: number;
            shopName: string;
            gmv: number;
            orders: number;
            shopeeSpend: number;
            metaSpend: number;
            adImpressions: number;
            adClicks: number;
            adOrders: number;
            adSales: number;
        }> = {};

        authorizedShops.forEach((s: any) => {
            const id = parseInt(s.shop_id, 10);
            shopAggMap[id] = {
                shopId: id,
                shopName: s.shop_name,
                gmv: 0,
                orders: 0,
                shopeeSpend: 0,
                metaSpend: 0,
                adImpressions: 0,
                adClicks: 0,
                adOrders: 0,
                adSales: 0
            };
        });

        // Group by date for trends
        const dailyTrendMap: Record<string, {
            date: string;
            label: string;
            gmv: number;
            orders: number;
            shopeeSpend: number;
            metaSpend: number;
        }> = {};

        dates.forEach(d => {
            const parsed = parseISO(d);
            dailyTrendMap[d] = {
                date: d,
                label: format(parsed, 'MMM d'),
                gmv: 0,
                orders: 0,
                shopeeSpend: 0,
                metaSpend: 0
            };
        });

        dbRows.forEach(row => {
            const rowShopId = parseInt(row.shop_id, 10);
            const rowGmv = parseFloat(row.gmv) || 0;
            const rowOrders = parseInt(row.order_count, 10) || 0;
            const rowShopeeSpend = parseFloat(row.shopee_cpc_spend) || 0;
            const rowMetaSpend = parseFloat(row.cpas_spend) || 0;

            totalGmv += rowGmv;
            totalOrders += rowOrders;
            totalShopeeSpend += rowShopeeSpend;
            totalMetaSpend += rowMetaSpend;
            totalAdImpressions += parseInt(row.ad_impressions, 10) || 0;
            totalAdClicks += parseInt(row.ad_clicks, 10) || 0;
            totalAdOrders += parseInt(row.ad_orders, 10) || 0;
            totalAdSales += parseFloat(row.ad_sales) || 0;

            if (shopAggMap[rowShopId]) {
                shopAggMap[rowShopId].gmv += rowGmv;
                shopAggMap[rowShopId].orders += rowOrders;
                shopAggMap[rowShopId].shopeeSpend += rowShopeeSpend;
                shopAggMap[rowShopId].metaSpend += rowMetaSpend;
                shopAggMap[rowShopId].adImpressions += parseInt(row.ad_impressions, 10) || 0;
                shopAggMap[rowShopId].adClicks += parseInt(row.ad_clicks, 10) || 0;
                shopAggMap[rowShopId].adOrders += parseInt(row.ad_orders, 10) || 0;
                shopAggMap[rowShopId].adSales += parseFloat(row.ad_sales) || 0;
                if (row.shop_name) shopAggMap[rowShopId].shopName = row.shop_name;
            }

            if (dailyTrendMap[row.date]) {
                dailyTrendMap[row.date].gmv += rowGmv;
                dailyTrendMap[row.date].orders += rowOrders;
                dailyTrendMap[row.date].shopeeSpend += rowShopeeSpend;
                dailyTrendMap[row.date].metaSpend += rowMetaSpend;
            }
        });

        // Calculate summary with and without taxes (8% SST + 8% WHT = 16%)
        const totalAdsSpendWithoutTax = totalShopeeSpend + totalMetaSpend;
        const sst = totalAdsSpendWithoutTax * 0.08;
        const wht = totalAdsSpendWithoutTax * 0.08;
        const totalTax = sst + wht;
        const totalAdsSpendWithTax = totalAdsSpendWithoutTax + totalTax;

        const shopeeSpendWithTax = totalShopeeSpend * 1.16;
        const metaSpendWithTax = totalMetaSpend * 1.16;

        const totalRoasWithoutTax = totalAdsSpendWithoutTax > 0 ? totalGmv / totalAdsSpendWithoutTax : 0;
        const totalRoasWithTax = totalAdsSpendWithTax > 0 ? totalGmv / totalAdsSpendWithTax : 0;

        const shopeeRoasWithoutTax = totalShopeeSpend > 0 ? totalGmv / totalShopeeSpend : 0;
        const shopeeRoasWithTax = shopeeSpendWithTax > 0 ? totalGmv / shopeeSpendWithTax : 0;

        const metaRoasWithoutTax = totalMetaSpend > 0 ? totalGmv / totalMetaSpend : 0;
        const metaRoasWithTax = metaSpendWithTax > 0 ? totalGmv / metaSpendWithTax : 0;

        const aov = totalOrders > 0 ? totalGmv / totalOrders : 0;

        const summary = {
            gmv: parseFloat(totalGmv.toFixed(2)),
            orders: totalOrders,
            aov: parseFloat(aov.toFixed(2)),
            shopeeSpend: parseFloat(totalShopeeSpend.toFixed(2)),
            shopeeSpendWithTax: parseFloat(shopeeSpendWithTax.toFixed(2)),
            metaSpend: parseFloat(totalMetaSpend.toFixed(2)),
            metaSpendWithTax: parseFloat(metaSpendWithTax.toFixed(2)),
            totalSpend: parseFloat(totalAdsSpendWithoutTax.toFixed(2)),
            totalSpendWithTax: parseFloat(totalAdsSpendWithTax.toFixed(2)),
            sst: parseFloat(sst.toFixed(2)),
            wht: parseFloat(wht.toFixed(2)),
            totalTax: parseFloat(totalTax.toFixed(2)),
            shopeeRoas: parseFloat(shopeeRoasWithoutTax.toFixed(2)),
            shopeeRoasWithTax: parseFloat(shopeeRoasWithTax.toFixed(2)),
            metaRoas: parseFloat(metaRoasWithoutTax.toFixed(2)),
            metaRoasWithTax: parseFloat(metaRoasWithTax.toFixed(2)),
            totalRoas: parseFloat(totalRoasWithoutTax.toFixed(2)),
            totalRoasWithTax: parseFloat(totalRoasWithTax.toFixed(2)),
            adImpressions: totalAdImpressions,
            adClicks: totalAdClicks,
            adOrders: totalAdOrders,
            adSales: parseFloat(totalAdSales.toFixed(2))
        };

        // Aggregate previous period
        let prevGmv = 0;
        let prevSpend = 0;
        let prevOrders = 0;
        prevDbResult.rows.forEach(r => {
            prevGmv += parseFloat(r.total_gmv) || 0;
            prevSpend += parseFloat(r.total_spend) || 0;
            prevOrders += parseInt(r.total_orders, 10) || 0;
        });
        const prevRoas = prevSpend > 0 ? prevGmv / prevSpend : 0;
        const prevSummary = {
            gmv: parseFloat(prevGmv.toFixed(2)),
            spend: parseFloat(prevSpend.toFixed(2)),
            orders: prevOrders,
            roas: parseFloat(prevRoas.toFixed(2))
        };

        const calcChange = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? 100 : 0;
            return parseFloat((((cur - prev) / prev) * 100).toFixed(1));
        };

        const changes = {
            gmv: calcChange(totalGmv, prevGmv),
            spend: calcChange(totalAdsSpendWithoutTax, prevSpend),
            roas: calcChange(totalRoasWithoutTax, prevRoas),
            orders: calcChange(totalOrders, prevOrders)
        };

        // Prepare per-shop list
        const shopsBreakdown = Object.values(shopAggMap).map(s => {
            const sShopeeWithTax = s.shopeeSpend * 1.16;
            const sMetaWithTax = s.metaSpend * 1.16;
            const sTotalSpend = s.shopeeSpend + s.metaSpend;
            const sTotalWithTax = sTotalSpend * 1.16;
            const sAov = s.orders > 0 ? s.gmv / s.orders : 0;

            return {
                shopId: s.shopId,
                shopName: s.shopName,
                gmv: parseFloat(s.gmv.toFixed(2)),
                orders: s.orders,
                aov: parseFloat(sAov.toFixed(2)),
                shopeeSpend: parseFloat(s.shopeeSpend.toFixed(2)),
                shopeeSpendWithTax: parseFloat(sShopeeWithTax.toFixed(2)),
                metaSpend: parseFloat(s.metaSpend.toFixed(2)),
                metaSpendWithTax: parseFloat(sMetaWithTax.toFixed(2)),
                totalSpend: parseFloat(sTotalSpend.toFixed(2)),
                totalSpendWithTax: parseFloat(sTotalWithTax.toFixed(2)),
                shopeeRoas: s.shopeeSpend > 0 ? parseFloat((s.gmv / s.shopeeSpend).toFixed(2)) : 0,
                shopeeRoasWithTax: sShopeeWithTax > 0 ? parseFloat((s.gmv / sShopeeWithTax).toFixed(2)) : 0,
                metaRoas: s.metaSpend > 0 ? parseFloat((s.gmv / s.metaSpend).toFixed(2)) : 0,
                metaRoasWithTax: sMetaWithTax > 0 ? parseFloat((s.gmv / sMetaWithTax).toFixed(2)) : 0,
                totalRoas: sTotalSpend > 0 ? parseFloat((s.gmv / sTotalSpend).toFixed(2)) : 0,
                totalRoasWithTax: sTotalWithTax > 0 ? parseFloat((s.gmv / sTotalWithTax).toFixed(2)) : 0,
                adImpressions: s.adImpressions,
                adClicks: s.adClicks,
                adOrders: s.adOrders,
                adSales: parseFloat(s.adSales.toFixed(2))
            };
        }).sort((a, b) => b.gmv - a.gmv);

        // Prepare trend points
        let trends: any[] = [];
        if (dates.length === 1) {
            // Single day: Try to fetch hourly breakdown from hourly route/client
            const singleDate = dates[0];
            const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
                label: `${String(i).padStart(2, '0')}:00`,
                gmv: 0,
                orders: 0,
                shopeeSpend: 0,
                shopeeSpendWithTax: 0,
                metaSpend: 0,
                metaSpendWithTax: 0,
                totalSpend: 0,
                totalSpendWithTax: 0,
                totalRoas: 0,
                totalRoasWithTax: 0
            }));

            // Fetch hourly data for selected shops
            await Promise.all(
                authorizedShops.map(async (shop: any) => {
                    try {
                        const { getValidShopeeToken, fetchShopeeAdsSpendForDate, fetchShopeeGMVAndOrders } = require('@/lib/shopee-client');
                        const sId = parseInt(shop.shop_id, 10);
                        const token = await getValidShopeeToken(sId);
                        const [hourlyRes, orderData] = await Promise.all([
                            fetchShopeeAdsSpendForDate(sId, token, singleDate).catch(() => ({ hourlySpend: [] })),
                            fetchShopeeGMVAndOrders(sId, token, singleDate, singleDate).catch(() => ({ orders: [] }))
                        ]);

                        // Distribute orders into hourly buckets
                        for (const order of orderData.orders || []) {
                            if (!order.isIncluded || !order.createTime) continue;
                            const utcMs = order.createTime * 1000;
                            const gmt8 = new Date(new Date(utcMs).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
                            const h = gmt8.getHours();
                            if (h >= 0 && h < 24) {
                                hourlyBuckets[h].gmv += order.gmv || 0;
                                hourlyBuckets[h].orders += 1;
                            }
                        }

                        // Distribute spend
                        const spendArr = hourlyRes.hourlySpend || [];
                        for (let h = 0; h < 24; h++) {
                            const val = spendArr[h] || 0;
                            hourlyBuckets[h].shopeeSpend += val;
                        }
                    } catch (e) {
                        // ignore hourly fetch error
                    }
                })
            );

            // Compute totalSpend & ROAS for hourly buckets
            trends = hourlyBuckets.map(b => {
                const totalBSpend = b.shopeeSpend;
                const totalBSpendWithTax = totalBSpend * 1.16;
                const bRoas = totalBSpend > 0 ? b.gmv / totalBSpend : 0;
                const bRoasWithTax = totalBSpendWithTax > 0 ? b.gmv / totalBSpendWithTax : 0;
                return {
                    label: b.label,
                    gmv: parseFloat(b.gmv.toFixed(2)),
                    orders: b.orders,
                    shopeeSpend: parseFloat(b.shopeeSpend.toFixed(2)),
                    shopeeSpendWithTax: parseFloat((b.shopeeSpend * 1.16).toFixed(2)),
                    metaSpend: 0,
                    metaSpendWithTax: 0,
                    totalSpend: parseFloat(totalBSpend.toFixed(2)),
                    totalSpendWithTax: parseFloat(totalBSpendWithTax.toFixed(2)),
                    totalRoas: parseFloat(bRoas.toFixed(2)),
                    totalRoasWithTax: parseFloat(bRoasWithTax.toFixed(2))
                };
            });
        } else {
            // Multi-day: use dailyTrendMap
            trends = dates.map(d => {
                const item = dailyTrendMap[d];
                const dayShopeeSpend = item.shopeeSpend;
                const dayMetaSpend = item.metaSpend;
                const dayTotalSpend = dayShopeeSpend + dayMetaSpend;
                const dayShopeeWithTax = dayShopeeSpend * 1.16;
                const dayMetaWithTax = dayMetaSpend * 1.16;
                const dayTotalWithTax = dayTotalSpend * 1.16;

                const dayRoas = dayTotalSpend > 0 ? item.gmv / dayTotalSpend : 0;
                const dayRoasWithTax = dayTotalWithTax > 0 ? item.gmv / dayTotalWithTax : 0;
                const dayShopeeRoas = dayShopeeSpend > 0 ? item.gmv / dayShopeeSpend : 0;
                const dayMetaRoas = dayMetaSpend > 0 ? item.gmv / dayMetaSpend : 0;

                return {
                    date: d,
                    label: item.label,
                    gmv: parseFloat(item.gmv.toFixed(2)),
                    orders: item.orders,
                    shopeeSpend: parseFloat(dayShopeeSpend.toFixed(2)),
                    shopeeSpendWithTax: parseFloat(dayShopeeWithTax.toFixed(2)),
                    metaSpend: parseFloat(dayMetaSpend.toFixed(2)),
                    metaSpendWithTax: parseFloat(dayMetaWithTax.toFixed(2)),
                    totalSpend: parseFloat(dayTotalSpend.toFixed(2)),
                    totalSpendWithTax: parseFloat(dayTotalWithTax.toFixed(2)),
                    shopeeRoas: parseFloat(dayShopeeRoas.toFixed(2)),
                    metaRoas: parseFloat(dayMetaRoas.toFixed(2)),
                    totalRoas: parseFloat(dayRoas.toFixed(2)),
                    totalRoasWithTax: parseFloat(dayRoasWithTax.toFixed(2))
                };
            });
        }

        return NextResponse.json({
            summary,
            prevSummary,
            changes,
            shopsBreakdown,
            trends,
            dateRange: { start: startDate, end: endDate },
            prevDateRange: prevRange
        });

    } catch (error: any) {
        console.error('[shopee-dashboard-api] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

function getZeroSummary() {
    return {
        gmv: 0,
        orders: 0,
        aov: 0,
        shopeeSpend: 0,
        shopeeSpendWithTax: 0,
        metaSpend: 0,
        metaSpendWithTax: 0,
        totalSpend: 0,
        totalSpendWithTax: 0,
        sst: 0,
        wht: 0,
        totalTax: 0,
        shopeeRoas: 0,
        shopeeRoasWithTax: 0,
        metaRoas: 0,
        metaRoasWithTax: 0,
        totalRoas: 0,
        totalRoasWithTax: 0,
        adImpressions: 0,
        adClicks: 0,
        adOrders: 0,
        adSales: 0
    };
}
