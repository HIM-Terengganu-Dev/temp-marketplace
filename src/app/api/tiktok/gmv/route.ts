import { NextResponse } from 'next/server';
import { fetchShopGMV } from '@/lib/metrics-fetcher';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    try {
        const result = await fetchShopGMV(shopNumber, startDate, endDate);
        return NextResponse.json({
            ...result,
            currency: 'RM',
            dateRange: { start: startDate, end: endDate }
        });
    } catch (error: any) {
        console.error('API Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
