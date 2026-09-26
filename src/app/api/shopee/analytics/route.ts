import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getConnectedShopeeShops, fetchMetaCPASInsightsForRange } from '@/lib/shopee-client';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

function getKLToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
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
        const startDate = searchParams.get('startDate') || subDays(parseISO(today), 6).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || today;
        const shopIdParam = searchParams.get('shopId') || 'ALL';

        // 1. Fetch connected Shopee shops
        const allConnectedShops = await getConnectedShopeeShops();
        const userRole = (session?.user as any)?.role;
        const allowedShopIds: string[] = (session?.user as any)?.allowed_shops || [];

        let authorizedShops = allConnectedShops;
        if (userRole !== 'admin' && allowedShopIds.length > 0) {
            authorizedShops = allConnectedShops.filter((s: any) =>
                allowedShopIds.includes(String(s.shop_id)) || allowedShopIds.includes(s.shop_name)
            );
        }

        if (authorizedShops.length === 0) {
            return NextResponse.json({
                funnelCombined: { impressions: 0, thruplay: 0, thruplayRate: 0, clicks: 0, clickRate: 0, ctr: 0, totalOrders: 0, cvr: 0, overallCvr: 0 },
                funnelShopee: { impressions: 0, clicks: 0, ctr: 0, totalOrders: 0, adOrders: 0, cvr: 0 },
                funnelMeta: { impressions: 0, thruplay: 0, thruplayRate: 0, linkClicks: 0, clickRate: 0, ctr: 0, spend: 0 },
                dailyTrends: [],
                shopsBreakdown: [],
                metaCampaigns: [],
                metaStatus: { status: 'unconfigured', message: 'No authorized shops found' },
                dateRange: { start: startDate, end: endDate }
            });
        }

        // Filter shop IDs according to user selection
        let filterShopIds: number[] = [];
        if (shopIdParam !== 'ALL') {
            const selectedNumeric = parseInt(shopIdParam, 10);
            if (authorizedShops.some((s: any) => parseInt(s.shop_id, 10) === selectedNumeric)) {
                filterShopIds = [selectedNumeric];
            } else {
                filterShopIds = authorizedShops.map((s: any) => parseInt(s.shop_id, 10));
            }
        } else {
            filterShopIds = authorizedShops.map((s: any) => parseInt(s.shop_id, 10));
        }

        // 2. Fetch Shopee data from Database & Meta insights in parallel
        const [dbMetricsRes, metaInsights] = await Promise.all([
            query(`
                SELECT 
                    TO_CHAR(date, 'YYYY-MM-DD') AS date, 
                    shop_id, 
                    shop_name, 
                    gmv, 
                    order_count, 
                    cpas_spend, 
                    shopee_cpc_spend, 
                    ad_impressions, 
                    ad_clicks, 
                    ad_orders, 
                    ad_sales,
                    COALESCE(meta_impressions, 0) AS meta_impressions,
                    COALESCE(meta_thruplay, 0) AS meta_thruplay,
                    COALESCE(meta_link_clicks, 0) AS meta_link_clicks
                FROM credentials.daily_shopee_metrics
                WHERE shop_id = ANY($1::bigint[]) AND date >= $2::date AND date <= $3::date
                ORDER BY date ASC
            `, [filterShopIds, startDate, endDate]),
            fetchMetaCPASInsightsForRange(shopIdParam === 'ALL' ? 'ALL' : filterShopIds[0], startDate, endDate)
        ]);

        const dbRows = dbMetricsRes.rows;

        // 3. Process Shopee DB metrics
        let totalShopeeAdImp = 0;
        let totalShopeeAdClicks = 0;
        let totalShopeeOrders = 0;
        let totalShopeeAdOrders = 0;
        let totalShopeeGmv = 0;
        let totalShopeeSpend = 0;

        let totalDbMetaImp = 0;
        let totalDbMetaThruplay = 0;
        let totalDbMetaClicks = 0;
        let totalDbMetaSpend = 0;

        const dailyDbMap: Record<string, {
            shopeeImp: number;
            shopeeClicks: number;
            shopeeOrders: number;
            shopeeAdOrders: number;
            shopeeGmv: number;
            dbMetaImp: number;
            dbMetaThruplay: number;
            dbMetaClicks: number;
            dbMetaSpend: number;
        }> = {};

        const shopBreakdownMap: Record<number, {
            shopId: number;
            shopName: string;
            impressions: number;
            clicks: number;
            orders: number;
            adOrders: number;
            gmv: number;
            shopeeSpend: number;
            cpasSpend: number;
        }> = {};

        // Initialize shop breakdown map
        filterShopIds.forEach(id => {
            const shopObj = authorizedShops.find((s: any) => parseInt(s.shop_id, 10) === id);
            shopBreakdownMap[id] = {
                shopId: id,
                shopName: shopObj?.shop_name || `Shop ${id}`,
                impressions: 0,
                clicks: 0,
                orders: 0,
                adOrders: 0,
                gmv: 0,
                shopeeSpend: 0,
                cpasSpend: 0
            };
        });

        // Generate full date list for consistent timeline
        const allDates = generateDateRange(startDate, endDate);
        allDates.forEach(d => {
            dailyDbMap[d] = {
                shopeeImp: 0,
                shopeeClicks: 0,
                shopeeOrders: 0,
                shopeeAdOrders: 0,
                shopeeGmv: 0,
                dbMetaImp: 0,
                dbMetaThruplay: 0,
                dbMetaClicks: 0,
                dbMetaSpend: 0
            };
        });

        for (const row of dbRows) {
            const rowDate = row.date;
            const shopId = parseInt(row.shop_id, 10);
            const imp = parseInt(row.ad_impressions || '0', 10);
            const clicks = parseInt(row.ad_clicks || '0', 10);
            const orders = parseInt(row.order_count || '0', 10);
            const adOrders = parseInt(row.ad_orders || '0', 10);
            const gmv = parseFloat(row.gmv || '0');
            const spSpend = parseFloat(row.shopee_cpc_spend || '0');
            const cpasSpend = parseFloat(row.cpas_spend || '0');

            const mImp = parseInt(row.meta_impressions || '0', 10);
            const mThruplay = parseInt(row.meta_thruplay || '0', 10);
            const mClicks = parseInt(row.meta_link_clicks || '0', 10);

            totalShopeeAdImp += imp;
            totalShopeeAdClicks += clicks;
            totalShopeeOrders += orders;
            totalShopeeAdOrders += adOrders;
            totalShopeeGmv += gmv;
            totalShopeeSpend += spSpend;

            totalDbMetaImp += mImp;
            totalDbMetaThruplay += mThruplay;
            totalDbMetaClicks += mClicks;
            totalDbMetaSpend += cpasSpend;

            if (dailyDbMap[rowDate]) {
                dailyDbMap[rowDate].shopeeImp += imp;
                dailyDbMap[rowDate].shopeeClicks += clicks;
                dailyDbMap[rowDate].shopeeOrders += orders;
                dailyDbMap[rowDate].shopeeAdOrders += adOrders;
                dailyDbMap[rowDate].shopeeGmv += gmv;
                dailyDbMap[rowDate].dbMetaImp += mImp;
                dailyDbMap[rowDate].dbMetaThruplay += mThruplay;
                dailyDbMap[rowDate].dbMetaClicks += mClicks;
                dailyDbMap[rowDate].dbMetaSpend += cpasSpend;
            }

            if (shopBreakdownMap[shopId]) {
                shopBreakdownMap[shopId].impressions += imp;
                shopBreakdownMap[shopId].clicks += clicks;
                shopBreakdownMap[shopId].orders += orders;
                shopBreakdownMap[shopId].adOrders += adOrders;
                shopBreakdownMap[shopId].gmv += gmv;
                shopBreakdownMap[shopId].shopeeSpend += spSpend;
                shopBreakdownMap[shopId].cpasSpend += cpasSpend;
            }
        }

        // 4. Resolve Meta Metrics: Use live API data if available, fallback to DB if token is expired/unconfigured
        const useLiveMeta = metaInsights.status === 'success' && (metaInsights.impressions > 0 || metaInsights.linkClicks > 0);

        const effectiveMetaImp = useLiveMeta ? metaInsights.impressions : totalDbMetaImp;
        const effectiveMetaThruplay = useLiveMeta ? metaInsights.thruplay : totalDbMetaThruplay;
        const effectiveMetaLinkClicks = useLiveMeta ? metaInsights.linkClicks : totalDbMetaClicks;
        const effectiveMetaSpend = useLiveMeta ? metaInsights.spend : totalDbMetaSpend;

        // Auto-save live Meta metrics to DB in background if live call was successful
        if (useLiveMeta && Object.keys(metaInsights.daily).length > 0) {
            (async () => {
                try {
                    for (const [d, mMetrics] of Object.entries(metaInsights.daily)) {
                        await query(`
                            UPDATE credentials.daily_shopee_metrics
                            SET 
                                meta_impressions = $1,
                                meta_thruplay = $2,
                                meta_link_clicks = $3,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE date = $4::date AND shop_id = ANY($5::bigint[])
                        `, [mMetrics.impressions, mMetrics.thruplay, mMetrics.linkClicks, d, filterShopIds]);
                    }
                } catch (e) {
                    console.warn('[shopee-analytics] Background DB sync of Meta metrics skipped:', e);
                }
            })();
        }

        // 5. Construct the 3 Funnels
        // Funnel 1: Combined Shopee & Meta Ads
        const combinedImpressions = totalShopeeAdImp + effectiveMetaImp;
        const combinedThruplay = effectiveMetaThruplay;
        const combinedThruplayRate = combinedImpressions > 0 ? parseFloat(((combinedThruplay / combinedImpressions) * 100).toFixed(2)) : 0;
        const combinedClicks = totalShopeeAdClicks + effectiveMetaLinkClicks;
        const combinedClickRate = combinedThruplay > 0 
            ? parseFloat(((combinedClicks / combinedThruplay) * 100).toFixed(2)) 
            : (combinedImpressions > 0 ? parseFloat(((combinedClicks / combinedImpressions) * 100).toFixed(2)) : 0);
        const combinedCtr = combinedImpressions > 0 ? parseFloat(((combinedClicks / combinedImpressions) * 100).toFixed(2)) : 0;
        const combinedOrders = totalShopeeOrders;
        const combinedCvr = combinedClicks > 0 ? parseFloat(((combinedOrders / combinedClicks) * 100).toFixed(2)) : 0;
        const combinedOverallCvr = combinedImpressions > 0 ? parseFloat(((combinedOrders / combinedImpressions) * 100).toFixed(4)) : 0;

        const funnelCombined = {
            impressions: combinedImpressions,
            thruplay: combinedThruplay,
            thruplayRate: combinedThruplayRate,
            clicks: combinedClicks,
            clickRate: combinedClickRate,
            ctr: combinedCtr,
            totalOrders: combinedOrders,
            cvr: combinedCvr,
            overallCvr: combinedOverallCvr,
            shopeeShare: combinedImpressions > 0 ? parseFloat(((totalShopeeAdImp / combinedImpressions) * 100).toFixed(1)) : 0,
            metaShare: combinedImpressions > 0 ? parseFloat(((effectiveMetaImp / combinedImpressions) * 100).toFixed(1)) : 0
        };

        // Funnel 2: Shopee Only
        const shopeeCtr = totalShopeeAdImp > 0 ? parseFloat(((totalShopeeAdClicks / totalShopeeAdImp) * 100).toFixed(2)) : 0;
        const shopeeCvr = totalShopeeAdClicks > 0 ? parseFloat(((totalShopeeOrders / totalShopeeAdClicks) * 100).toFixed(2)) : 0;
        const shopeeAdCvr = totalShopeeAdClicks > 0 ? parseFloat(((totalShopeeAdOrders / totalShopeeAdClicks) * 100).toFixed(2)) : 0;

        const funnelShopee = {
            impressions: totalShopeeAdImp,
            clicks: totalShopeeAdClicks,
            ctr: shopeeCtr,
            totalOrders: totalShopeeOrders,
            adOrders: totalShopeeAdOrders,
            cvr: shopeeCvr,
            adCvr: shopeeAdCvr,
            gmv: parseFloat(totalShopeeGmv.toFixed(2)),
            spend: parseFloat(totalShopeeSpend.toFixed(2))
        };

        // Funnel 3: Meta Ads Only
        const metaThruplayRate = effectiveMetaImp > 0 ? parseFloat(((effectiveMetaThruplay / effectiveMetaImp) * 100).toFixed(2)) : 0;
        const metaClickRate = effectiveMetaThruplay > 0 
            ? parseFloat(((effectiveMetaLinkClicks / effectiveMetaThruplay) * 100).toFixed(2))
            : (effectiveMetaImp > 0 ? parseFloat(((effectiveMetaLinkClicks / effectiveMetaImp) * 100).toFixed(2)) : 0);
        const metaCtr = effectiveMetaImp > 0 ? parseFloat(((effectiveMetaLinkClicks / effectiveMetaImp) * 100).toFixed(2)) : 0;

        const funnelMeta = {
            impressions: effectiveMetaImp,
            thruplay: effectiveMetaThruplay,
            thruplayRate: metaThruplayRate,
            linkClicks: effectiveMetaLinkClicks,
            clickRate: metaClickRate,
            ctr: metaCtr,
            spend: parseFloat(effectiveMetaSpend.toFixed(2))
        };

        // 6. Construct Daily Trends
        const dailyTrends = allDates.map(dateStr => {
            const dbData = dailyDbMap[dateStr] || {
                shopeeImp: 0,
                shopeeClicks: 0,
                shopeeOrders: 0,
                shopeeAdOrders: 0,
                shopeeGmv: 0,
                dbMetaImp: 0,
                dbMetaThruplay: 0,
                dbMetaClicks: 0,
                dbMetaSpend: 0
            };

            const liveMetaDay = metaInsights.daily[dateStr];
            const mImp = liveMetaDay ? liveMetaDay.impressions : dbData.dbMetaImp;
            const mThruplay = liveMetaDay ? liveMetaDay.thruplay : dbData.dbMetaThruplay;
            const mClicks = liveMetaDay ? liveMetaDay.linkClicks : dbData.dbMetaClicks;
            const mSpend = liveMetaDay ? liveMetaDay.spend : dbData.dbMetaSpend;

            const totalDayImp = dbData.shopeeImp + mImp;
            const totalDayClicks = dbData.shopeeClicks + mClicks;
            const dayCtr = totalDayImp > 0 ? parseFloat(((totalDayClicks / totalDayImp) * 100).toFixed(2)) : 0;

            const shopeeDayCtr = dbData.shopeeImp > 0 ? parseFloat(((dbData.shopeeClicks / dbData.shopeeImp) * 100).toFixed(2)) : 0;
            const metaDayCtr = mImp > 0 ? parseFloat(((mClicks / mImp) * 100).toFixed(2)) : 0;
            const metaDayThruplayRate = mImp > 0 ? parseFloat(((mThruplay / mImp) * 100).toFixed(2)) : 0;

            const dateObj = new Date(dateStr);
            const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });

            return {
                date: dateStr,
                displayDate,
                // Combined
                combinedImpressions: totalDayImp,
                combinedClicks: totalDayClicks,
                combinedCtr: dayCtr,
                combinedOrders: dbData.shopeeOrders,
                // Shopee
                shopeeImpressions: dbData.shopeeImp,
                shopeeClicks: dbData.shopeeClicks,
                shopeeCtr: shopeeDayCtr,
                shopeeOrders: dbData.shopeeOrders,
                shopeeAdOrders: dbData.shopeeAdOrders,
                shopeeGmv: dbData.shopeeGmv,
                // Meta
                metaImpressions: mImp,
                metaThruplay: mThruplay,
                metaThruplayRate: metaDayThruplayRate,
                metaLinkClicks: mClicks,
                metaCtr: metaDayCtr,
                metaSpend: mSpend
            };
        });

        // 7. Format Shop Breakdown Table
        const shopsBreakdown = Object.values(shopBreakdownMap).map(s => {
            const ctr = s.impressions > 0 ? parseFloat(((s.clicks / s.impressions) * 100).toFixed(2)) : 0;
            const cvr = s.clicks > 0 ? parseFloat(((s.orders / s.clicks) * 100).toFixed(2)) : 0;
            return {
                shopId: s.shopId,
                shopName: s.shopName,
                impressions: s.impressions,
                clicks: s.clicks,
                ctr,
                orders: s.orders,
                adOrders: s.adOrders,
                cvr,
                gmv: parseFloat(s.gmv.toFixed(2)),
                shopeeSpend: parseFloat(s.shopeeSpend.toFixed(2)),
                cpasSpend: parseFloat(s.cpasSpend.toFixed(2))
            };
        }).sort((a, b) => b.orders - a.orders);

        return NextResponse.json({
            success: true,
            dateRange: { start: startDate, end: endDate },
            selectedShopId: shopIdParam,
            funnelCombined,
            funnelShopee,
            funnelMeta,
            dailyTrends,
            shopsBreakdown,
            metaCampaigns: metaInsights.campaigns || [],
            metaStatus: {
                status: metaInsights.status,
                isLive: useLiveMeta,
                message: metaInsights.status === 'token_expired'
                    ? 'Meta access token expired. Serving cached database metrics.'
                    : metaInsights.status === 'unconfigured'
                        ? 'Meta Ad account or token unconfigured. Showing available store metrics.'
                        : 'Live Meta CPAS metrics synced successfully.'
            }
        });

    } catch (error: any) {
        console.error('Shopee Analytics GET API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
