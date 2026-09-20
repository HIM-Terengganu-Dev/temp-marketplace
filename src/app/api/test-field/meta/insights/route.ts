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

    const datePreset = searchParams.get('datePreset') || 'last_7d';
    const breakdown = searchParams.get('breakdown'); // e.g. 'publisher_platform' or 'device_platform'

    try {
        const fields = [
            'campaign_name',
            'campaign_id',
            'spend',
            'impressions',
            'clicks',
            'cpc',
            'cpm',
            'ctr',
            'reach',
            'frequency',
            'actions',
            'cost_per_action_type'
        ].join(',');

        let url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=campaign&fields=${fields}&date_preset=${datePreset}&limit=100&access_token=${token}`;

        if (breakdown) {
            url += `&breakdowns=${breakdown}`;
        }

        const [campaignInsightsRes, accountSummaryRes] = await Promise.allSettled([
            axios.get(url),
            axios.get(`https://graph.facebook.com/v19.0/${adAccountId}/insights?level=account&fields=${fields}&date_preset=${datePreset}&access_token=${token}`)
        ]);

        const campaignInsights = campaignInsightsRes.status === 'fulfilled' ? campaignInsightsRes.value.data.data || [] : [];
        const accountSummary = accountSummaryRes.status === 'fulfilled' && accountSummaryRes.value.data.data?.length > 0 
            ? accountSummaryRes.value.data.data[0] 
            : null;

        // Extract action types (link clicks, purchases, adds to cart if CPAS)
        const formatActions = (actionsList: any[]) => {
            if (!Array.isArray(actionsList)) return {};
            const res: Record<string, number> = {};
            actionsList.forEach(a => {
                res[a.action_type] = parseFloat(a.value || '0');
            });
            return res;
        };

        const formattedCampaigns = campaignInsights.map((item: any) => ({
            campaignId: item.campaign_id,
            campaignName: item.campaign_name,
            spend: parseFloat(item.spend || '0'),
            impressions: parseInt(item.impressions || '0', 10),
            clicks: parseInt(item.clicks || '0', 10),
            cpc: parseFloat(item.cpc || '0'),
            cpm: parseFloat(item.cpm || '0'),
            ctr: parseFloat(item.ctr || '0'),
            reach: parseInt(item.reach || '0', 10),
            frequency: parseFloat(item.frequency || '0'),
            actions: formatActions(item.actions),
            publisherPlatform: item.publisher_platform || null,
            platformPosition: item.platform_position || null,
            devicePlatform: item.device_platform || null,
            dateStart: item.date_start,
            dateStop: item.date_stop
        }));

        return NextResponse.json({
            success: true,
            adAccountId,
            datePreset,
            accountSummary: accountSummary ? {
                spend: parseFloat(accountSummary.spend || '0'),
                impressions: parseInt(accountSummary.impressions || '0', 10),
                clicks: parseInt(accountSummary.clicks || '0', 10),
                cpc: parseFloat(accountSummary.cpc || '0'),
                cpm: parseFloat(accountSummary.cpm || '0'),
                ctr: parseFloat(accountSummary.ctr || '0'),
                reach: parseInt(accountSummary.reach || '0', 10),
                frequency: parseFloat(accountSummary.frequency || '0'),
                actions: formatActions(accountSummary.actions)
            } : null,
            campaigns: formattedCampaigns
        });
    } catch (error: any) {
        console.error('Test Field Meta Insights Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch insights.'
        }, { status: 500 });
    }
}
