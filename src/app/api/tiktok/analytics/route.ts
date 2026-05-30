import { NextResponse } from 'next/server';
import { fetchShopAnalytics } from '@/lib/metrics-fetcher';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}` }, { status: 400 });
    }

    try {
        const result = await fetchShopAnalytics(shopNumber, startDate, endDate);
        return NextResponse.json(result || {
            visitors: 0,
            impressions: 0,
            visitorBreakdowns: { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 },
            impressionBreakdowns: { LIVE: 0, VIDEO: 0, PRODUCT_CARD: 0 }
        });
    } catch (error: any) {
        console.error('Analytics API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
