import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, clientId, clientSecret } = body;

        if (!code) {
            return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
        }

        // Use environment variables if not provided in the request body (allows manual input overlay in UI)
        const finalClientId = clientId || process.env.FB_CLIENT_ID;
        const finalClientSecret = clientSecret || process.env.FB_CLIENT_SECRET;

        if (!finalClientId || !finalClientSecret) {
            return NextResponse.json({ 
                error: 'Meta Client ID and Client Secret must be configured in environment or provided in request.' 
            }, { status: 400 });
        }

        const redirectUri = 'https://temp-marketplace.vercel.app/facebook/callback';
        console.log(`Starting Facebook token exchange. App ID: ${finalClientId}, Redirect URI: ${redirectUri}`);

        // Step 1: Exchange auth code for short-lived access token (lasts ~2 hours)
        const shortLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${finalClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${finalClientSecret}&code=${code}`;
        
        let shortLivedToken = '';
        try {
            const shortLivedResponse = await axios.get(shortLivedUrl);
            shortLivedToken = shortLivedResponse.data.access_token;
            if (!shortLivedToken) {
                throw new Error('No access token returned in short-lived token response.');
            }
        } catch (err: any) {
            console.error('Error fetching short-lived Facebook token:', err.response?.data || err.message);
            const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to exchange authorization code.';
            return NextResponse.json({ error: `Facebook API Error: ${errorMsg}` }, { status: 400 });
        }

        // Step 2: Exchange short-lived token for long-lived access token (lasts ~60 days)
        console.log('Upgrading Facebook token to long-lived (60 days)...');
        const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${finalClientId}&client_secret=${finalClientSecret}&fb_exchange_token=${shortLivedToken}`;

        try {
            const longLivedResponse = await axios.get(longLivedUrl);
            const data = longLivedResponse.data;
            
            console.log('Facebook long-lived token generated successfully!');
            return NextResponse.json({
                access_token: data.access_token,
                token_type: data.token_type,
                expires_in: data.expires_in, // typically in seconds (lasts ~60 days)
            });
        } catch (err: any) {
            console.error('Error exchanging short-lived token for long-lived token:', err.response?.data || err.message);
            const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to upgrade token to long-lived.';
            return NextResponse.json({ error: `Facebook Token Upgrade Error: ${errorMsg}` }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Meta OAuth Token Exchange Server Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
