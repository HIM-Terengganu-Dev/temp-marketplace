import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const adAccountId = searchParams.get('adAccountId');

    if (!campaignId && !adAccountId) {
        return NextResponse.json({ error: 'campaignId or adAccountId is required.' }, { status: 400 });
    }

    try {
        const target = campaignId ? campaignId : adAccountId;
        const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,optimization_goal,billing_event,targeting,created_time,updated_time';
        const url = `https://graph.facebook.com/v19.0/${target}/adsets?fields=${fields}&limit=50&access_token=${token}`;

        const response = await axios.get(url);
        const adsets = response.data.data || [];

        return NextResponse.json({
            success: true,
            campaignId,
            adsets: adsets.map((a: any) => ({
                id: a.id,
                name: a.name,
                status: a.status,
                effectiveStatus: a.effective_status,
                dailyBudget: a.daily_budget ? parseFloat(a.daily_budget) / 100 : null,
                lifetimeBudget: a.lifetime_budget ? parseFloat(a.lifetime_budget) / 100 : null,
                optimizationGoal: a.optimization_goal,
                billingEvent: a.billing_event,
                targeting: a.targeting || null
            }))
        });
    } catch (error: any) {
        console.error('Test Field AdSets GET Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch ad sets.'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { adSetId, status, dailyBudgetRM, name } = body;

        if (!adSetId) {
            return NextResponse.json({ error: 'adSetId is required.' }, { status: 400 });
        }

        const payload: Record<string, any> = {};
        if (status) {
            if (!['ACTIVE', 'PAUSED'].includes(status)) {
                return NextResponse.json({ error: 'Status must be ACTIVE or PAUSED.' }, { status: 400 });
            }
            payload.status = status;
        }

        if (dailyBudgetRM !== undefined && dailyBudgetRM !== null) {
            payload.daily_budget = Math.round(Number(dailyBudgetRM) * 100);
        }

        if (name) {
            payload.name = name.trim();
        }

        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ error: 'No parameters provided for update.' }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v19.0/${adSetId}`;
        const response = await axios.post(url, payload, {
            params: { access_token: token }
        });

        return NextResponse.json({
            success: true,
            adSetId,
            updated: payload,
            metaResult: response.data
        });
    } catch (error: any) {
        console.error('Test Field AdSets Mutation Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to update ad set.'
        }, { status: 500 });
    }
}
