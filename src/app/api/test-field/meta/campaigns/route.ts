import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let adAccountId = searchParams.get('adAccountId') || 'act_1462603651298383';
    if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
    }

    try {
        const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,objective,buying_type,created_time,updated_time';
        const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${fields}&limit=50&access_token=${token}`;
        
        const response = await axios.get(url);
        const campaigns = response.data.data || [];

        // Also fetch recent 7-day spend per campaign to show alongside
        const insightsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr&date_preset=last_7d&limit=100&access_token=${token}`;
        
        let insightsMap: Record<string, any> = {};
        try {
            const insRes = await axios.get(insightsUrl);
            const insData = insRes.data.data || [];
            insData.forEach((row: any) => {
                insightsMap[row.campaign_id] = row;
            });
        } catch (insErr: any) {
            console.warn('Could not fetch campaign insights for comparison:', insErr.message);
        }

        const enrichedCampaigns = campaigns.map((camp: any) => {
            const insight = insightsMap[camp.id];
            return {
                ...camp,
                recentSpend: insight ? parseFloat(insight.spend || '0') : 0,
                recentClicks: insight ? parseInt(insight.clicks || '0', 10) : 0,
                recentImpressions: insight ? parseInt(insight.impressions || '0', 10) : 0,
                recentCtr: insight ? parseFloat(insight.ctr || '0') : 0,
                recentCpc: insight ? parseFloat(insight.cpc || '0') : 0,
            };
        });

        return NextResponse.json({
            success: true,
            adAccountId,
            campaigns: enrichedCampaigns
        });
    } catch (error: any) {
        console.error('Test Field Meta Campaigns GET Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch campaigns.'
        }, { status: 500 });
    }
}

/**
 * Mutate campaign: toggle status (ACTIVE / PAUSED) or update daily budget
 */
export async function POST(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { campaignId, status, dailyBudgetInCents } = body;

        if (!campaignId) {
            return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
        }

        const payload: Record<string, any> = {};
        if (status) {
            if (!['ACTIVE', 'PAUSED'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status. Must be ACTIVE or PAUSED.' }, { status: 400 });
            }
            payload.status = status;
        }

        if (dailyBudgetInCents !== undefined && dailyBudgetInCents !== null) {
            payload.daily_budget = Math.round(Number(dailyBudgetInCents));
        }

        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ error: 'No update parameters provided.' }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v19.0/${campaignId}`;
        const response = await axios.post(url, payload, {
            params: { access_token: token }
        });

        return NextResponse.json({
            success: true,
            campaignId,
            updated: payload,
            metaResult: response.data
        });
    } catch (error: any) {
        console.error('Test Field Meta Campaign Mutation Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to update campaign on Meta.'
        }, { status: 500 });
    }
}
