import { NextResponse } from 'next/server';
import { fetchShopROAS, ensureDailyMetricsSynced } from '@/lib/metrics-fetcher';

export async function GET(request: Request) {
    // Trigger daily metric background sync for 2 weeks ago if missing
    ensureDailyMetricsSynced().catch(err => console.error('[Auto-Sync Trigger] Background sync failed:', err));

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    try {
        const result = await fetchShopROAS(shopNumber, startDate, endDate);
        return NextResponse.json({
            ...result,
            shopNumber,
            metricType: 'roas',
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)'
        });
    } catch (error: any) {
        console.error('ROAS API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
