import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateShopeeSignature } from '@/lib/shopee-client';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get origin from request or query params to make sure we support localtunnel, localhost, and Vercel domains dynamically
        const { searchParams } = new URL(request.url);
        const originParam = searchParams.get('origin');
        
        let origin = originParam;
        if (!origin) {
            const host = request.headers.get('host') || 'localhost:3000';
            const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
            origin = `${protocol}://${host}`;
        }

        const partnerId = process.env.SHOPEE_PARTNER_ID || '';
        const apiBaseUrl = process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeesz.com';
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/api/v2/shop/auth_partner';
        
        // Generate security signature
        const sign = generateShopeeSignature(path, timestamp);
        
        // Callback redirect URL path
        const redirectUri = `${origin}/api/auth/shopee/callback`;
        
        // Build the complete Shopee authentication URL
        const authUrl = `${apiBaseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}`;

        console.log(`Generated Shopee Auth URL: ${authUrl} with callback: ${redirectUri}`);

        return NextResponse.json({ url: authUrl });
    } catch (error: any) {
        console.error('Error generating Shopee Auth URL:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
