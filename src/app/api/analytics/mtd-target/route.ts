import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMtdTarget, saveMtdTarget } from '@/lib/mtd-target';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const [curYStr, curMStr] = todayKL.split('-');
        const defaultTargetMonth = `${curYStr}-${curMStr}`;

        const targetMonth = searchParams.get('targetMonth') || defaultTargetMonth;
        const company = searchParams.get('company') || searchParams.get('companyFilter') || 'ALL';

        const targetData = await getMtdTarget(targetMonth, company);
        return NextResponse.json(targetData);
    } catch (e: any) {
        console.error('[mtd-target] GET error:', e);
        return NextResponse.json({ error: e.message || 'Failed to fetch target' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { targetMonth, company = 'ALL', monthlyTarget, tiktokTargetVal } = body;

        if (!targetMonth || typeof targetMonth !== 'string') {
            return NextResponse.json({ error: 'targetMonth is required (e.g. YYYY-MM)' }, { status: 400 });
        }

        const parsedMonthlyTarget = Number(monthlyTarget);
        const parsedTiktokTargetVal = Number(tiktokTargetVal);

        if (isNaN(parsedMonthlyTarget) || parsedMonthlyTarget < 0) {
            return NextResponse.json({ error: 'Invalid monthlyTarget: must be a positive number' }, { status: 400 });
        }

        if (isNaN(parsedTiktokTargetVal) || parsedTiktokTargetVal < 0) {
            return NextResponse.json({ error: 'Invalid tiktokTargetVal: must be a positive number' }, { status: 400 });
        }

        const updatedBy = session.user?.name || session.user?.email || 'authenticated_user';

        const saved = await saveMtdTarget(
            targetMonth,
            company,
            parsedMonthlyTarget,
            parsedTiktokTargetVal,
            updatedBy
        );

        return NextResponse.json({
            success: true,
            ...saved
        });
    } catch (e: any) {
        console.error('[mtd-target] POST error:', e);
        return NextResponse.json({ error: e.message || 'Failed to save target' }, { status: 500 });
    }
}
