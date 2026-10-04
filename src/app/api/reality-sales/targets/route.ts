import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDepartmentTargets, saveDepartmentTarget, DepartmentKey } from '@/lib/department-targets';

export const dynamic = 'force-dynamic';

function getMonthKL(): string {
    const todayKL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const [y, m] = todayKL.split('-');
    return `${y}-${m}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') || getMonthKL();

        const targets = await getDepartmentTargets(month);
        return NextResponse.json({
            success: true,
            month,
            targets,
        });
    } catch (err: any) {
        console.error('[reality-sales/targets] GET error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch targets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = ((session.user as any).role || '').toLowerCase();
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            return NextResponse.json(
                { error: 'Forbidden: Only administrators can configure department targets' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { month, department, targetAmount } = body;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json({ error: 'Valid month (YYYY-MM) is required' }, { status: 400 });
        }

        if (!['marketing', 'livehost', 'affiliate'].includes(department)) {
            return NextResponse.json({ error: 'Invalid department key' }, { status: 400 });
        }

        const parsedAmount = Number(targetAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: 'targetAmount must be a positive number' }, { status: 400 });
        }

        const updatedBy = session.user.name || session.user.email || 'admin';
        const saved = await saveDepartmentTarget(
            month,
            department as DepartmentKey,
            parsedAmount,
            updatedBy
        );

        return NextResponse.json({
            success: true,
            target: saved,
        });
    } catch (err: any) {
        console.error('[reality-sales/targets] POST error:', err);
        return NextResponse.json({ error: err.message || 'Failed to save target' }, { status: 500 });
    }
}
