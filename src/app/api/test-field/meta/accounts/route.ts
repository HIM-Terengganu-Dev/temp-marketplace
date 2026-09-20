import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    const token = process.env.FB_ACCESS_TOKEN;

    if (!token) {
        return NextResponse.json({ 
            error: 'FB_ACCESS_TOKEN is missing in environment variables.' 
        }, { status: 400 });
    }

    try {
        // Fetch user identity, ad accounts, and pages in parallel
        const [meRes, adAccountsRes, pagesRes] = await Promise.allSettled([
            axios.get(`https://graph.facebook.com/v19.0/me?access_token=${token}`),
            axios.get(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,currency,account_status,balance,amount_spent,spend_cap&limit=25&access_token=${token}`),
            axios.get(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,followers_count,verification_status&limit=25&access_token=${token}`)
        ]);

        const me = meRes.status === 'fulfilled' ? meRes.value.data : null;
        const adAccounts = adAccountsRes.status === 'fulfilled' ? adAccountsRes.value.data.data || [] : [];
        const pages = pagesRes.status === 'fulfilled' ? pagesRes.value.data.data || [] : [];

        // Known CPAS accounts mapping for tags
        const knownCpasAccounts: Record<string, string> = {
            'act_1462603651298383': 'Shopee CPAS (Shop 1298030530)',
            'act_1199749218961620': 'Shopee CPAS 2 (Shop 1077500606 & 1256177782)',
            'act_1201347685480759': 'CPAS - himclinic'
        };

        const enrichedAccounts = adAccounts.map((acc: any) => ({
            ...acc,
            isCpas: !!knownCpasAccounts[acc.id],
            cpasLabel: knownCpasAccounts[acc.id] || null,
            statusLabel: acc.account_status === 1 ? 'ACTIVE' : acc.account_status === 2 ? 'DISABLED' : 'UNSETTLED'
        }));

        return NextResponse.json({
            success: true,
            user: me,
            adAccounts: enrichedAccounts,
            pages,
            tokenMeta: {
                hasToken: true,
                tokenLength: token.length
            }
        });
    } catch (error: any) {
        console.error('Test Field Meta Accounts Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch Meta accounts.'
        }, { status: 500 });
    }
}
