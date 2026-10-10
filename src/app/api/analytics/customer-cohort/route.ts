import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCustomerCohortStats } from '@/lib/customer-cohort';

function todayKL(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2026-06-01';
        const endDate = searchParams.get('endDate') || todayKL();
        const shopIdParam = searchParams.get('shopId'); // optional single or comma-separated: '1,2'
        const marketplace = searchParams.get('marketplace') || 'tiktok';

        const shopIds = shopIdParam ? shopIdParam.split(',').map(s => s.trim()) : undefined;

        const data = await getCustomerCohortStats({
            startDate,
            endDate,
            shopIds,
            marketplace
        });

        return NextResponse.json({
            success: true,
            filter: {
                startDate,
                endDate,
                shopIds: shopIds || 'ALL',
                marketplace
            },
            data
        });
    } catch (err: any) {
        console.error('Customer Cohort API Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
