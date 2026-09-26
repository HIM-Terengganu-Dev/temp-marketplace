import { NextResponse } from 'next/server';
import { 
    refreshMetaAccessToken, 
    inspectMetaToken, 
    getValidMetaToken,
    generateMetaOAuthUrl 
} from '@/lib/meta-token';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action'); // 'inspect' | 'valid'

        if (action === 'valid') {
            const result = await getValidMetaToken();
            return NextResponse.json(result);
        }

        const inspection = await inspectMetaToken();
        const reauthUrl = generateMetaOAuthUrl();

        return NextResponse.json({
            ...inspection,
            reauthUrl: inspection.isExpired ? reauthUrl : undefined
        });
    } catch (error: any) {
        console.error('[API /api/auth/facebook/refresh GET] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // body empty is fine
        }

        const { token, clientId, clientSecret, force } = body;

        if (force) {
            const validResult = await getValidMetaToken(true);
            return NextResponse.json(validResult);
        }

        const result = await refreshMetaAccessToken({
            token,
            clientId,
            clientSecret,
            saveToDatabase: true
        });

        if (!result.success) {
            return NextResponse.json(result, { status: result.isExpired ? 401 : 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API /api/auth/facebook/refresh POST] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
}
