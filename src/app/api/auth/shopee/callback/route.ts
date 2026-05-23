import { NextResponse } from 'next/server';
import { 
    exchangeShopeeCodeForTokens, 
    saveShopeeTokens, 
    getShopeeShopInfo 
} from '@/lib/shopee-client';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const shopIdStr = searchParams.get('shop_id');

    console.log(`Received Shopee callback. Code: ${code ? 'Yes' : 'No'}, Shop ID: ${shopIdStr}`);

    if (!code || !shopIdStr) {
        console.error('Shopee Callback missing code or shop_id:', { code, shopIdStr });
        return NextResponse.redirect(`${origin}/shopee?shopee_error=missing_params`);
    }

    try {
        const shopId = parseInt(shopIdStr, 10);
        if (isNaN(shopId)) {
            throw new Error(`Invalid shop_id parsed from callback: ${shopIdStr}`);
        }

        // 1. Exchange authorization code for access & refresh tokens
        const tokens = await exchangeShopeeCodeForTokens(code, shopId);

        // 2. Fetch the real Shopee shop profile info (e.g. name) using the new access token
        let shopName = `Shopee Shop ${shopId}`;
        try {
            const info = await getShopeeShopInfo(shopId, tokens.access_token);
            if (info && info.shop_name) {
                shopName = info.shop_name;
            }
        } catch (infoError) {
            console.warn(`Could not fetch Shopee shop details for ${shopId} (falling back to placeholder name):`, infoError);
        }

        // 3. Save the active tokens securely in our Neon Postgres DB
        await saveShopeeTokens(
            shopId,
            shopName,
            tokens.access_token,
            tokens.refresh_token,
            tokens.expire_in,
            tokens.refresh_token_expire_in
        );

        console.log(`Successfully connected and saved Shopee store "${shopName}" (${shopId})!`);

        // 4. Redirect the merchant back to Shopee page with a success flag
        return NextResponse.redirect(`${origin}/shopee?shopee_connected=true`);

    } catch (error: any) {
        console.error('Shopee Auth Handshake Error:', error);
        return NextResponse.redirect(`${origin}/shopee?shopee_error=${encodeURIComponent(error.message || 'handshake_failed')}`);
    }
}
