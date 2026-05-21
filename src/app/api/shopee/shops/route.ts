import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnectedShopeeShops } from '@/lib/shopee-client';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const shops = await getConnectedShopeeShops();
        return NextResponse.json(shops);
    } catch (error: any) {
        console.error('Error fetching Shopee shops:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
