import { NextResponse } from 'next/server';
import { fetchShopGMV, fetchShopROAS, fetchShopAnalytics, SHOPS } from '@/lib/metrics-fetcher';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // Basic authorization check - can be enhanced later
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
        }

        // We will fetch for all configured shops
        const shopNumbers = Object.keys(SHOPS).map(k => parseInt(k, 10));

        const results = await Promise.all(shopNumbers.map(async (num) => {
            try {
                const [gmvData, roasData, analyticsData] = await Promise.all([
                    fetchShopGMV(num, startDate, endDate),
                    fetchShopROAS(num, startDate, endDate),
                    fetchShopAnalytics(num, startDate, endDate)
                ]);

                return {
                    shopNumber: num,
                    shopName: gmvData.shopName,
                    gmv: gmvData.gmv || 0,
                    cogs: gmvData.cogs || 0,
                    orders: gmvData.orderCount || 0,
                    adsSpend: roasData.totalAdsSpend || 0, // totalAdsSpend is before tax, or you can use totalCostWithTaxes
                    visitors: analyticsData?.visitors || 0,
                    impressions: analyticsData?.impressions || 0,
                    visitorBreakdowns: analyticsData?.visitorBreakdowns || { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 },
                    impressionBreakdowns: analyticsData?.impressionBreakdowns || { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 }
                };
            } catch (e) {
                console.error(`Error fetching BOD metrics for shop ${num}:`, e);
                return null;
            }
        }));

        const validResults = results.filter(r => r !== null);

        // Aggregate across all shops
        const aggregated = validResults.reduce((acc, curr) => {
            acc.gmv += curr.gmv;
            acc.cogs += curr.cogs;
            acc.orders += curr.orders;
            acc.adsSpend += curr.adsSpend;
            acc.visitors += curr.visitors;
            acc.impressions += curr.impressions;
            
            acc.visitorBreakdowns.LIVE += curr.visitorBreakdowns.LIVE;
            acc.visitorBreakdowns.VIDEO += curr.visitorBreakdowns.VIDEO;
            acc.visitorBreakdowns.PRODUCT_CARD += curr.visitorBreakdowns.PRODUCT_CARD;
            
            acc.impressionBreakdowns.LIVE += curr.impressionBreakdowns.LIVE;
            acc.impressionBreakdowns.VIDEO += curr.impressionBreakdowns.VIDEO;
            acc.impressionBreakdowns.PRODUCT_CARD += curr.impressionBreakdowns.PRODUCT_CARD;
            
            return acc;
        }, {
            gmv: 0,
            cogs: 0,
            orders: 0,
            adsSpend: 0,
            visitors: 0,
            impressions: 0,
            visitorBreakdowns: { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 },
            impressionBreakdowns: { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 }
        });

        return NextResponse.json({
            aggregated,
            shops: validResults
        });

    } catch (error: any) {
        console.error('BOD metrics error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
