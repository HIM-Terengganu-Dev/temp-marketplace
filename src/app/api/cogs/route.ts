import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mappedOnly = searchParams.get('mappedOnly') === 'true';
        const unmappedOnly = searchParams.get('unmappedOnly') === 'true';
        
        let queryText = `
            SELECT id, marketplace, shop_id, sku_id, seller_sku, product_name, price, cogs_cost, is_mapped, created_at, updated_at
            FROM credentials.sku_cogs
        `;
        const queryParams: any[] = [];

        if (mappedOnly) {
            queryText += ` WHERE is_mapped = true`;
        } else if (unmappedOnly) {
            queryText += ` WHERE is_mapped = false`;
        }

        queryText += ` ORDER BY is_mapped ASC, created_at DESC`;

        const dbRes = await query(queryText, queryParams);
        return NextResponse.json({ skus: dbRes.rows });
    } catch (e: any) {
        console.error('[COGS API GET Error]:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { skus } = body; // Expecting an array of objects: { sku_id: string, cogs_cost: number }

        if (!skus || !Array.isArray(skus)) {
            return NextResponse.json({ error: 'Invalid payload: "skus" array required' }, { status: 400 });
        }

        for (const item of skus) {
            const { sku_id, cogs_cost } = item;
            if (!sku_id || typeof cogs_cost !== 'number') {
                continue;
            }

            await query(`
                UPDATE credentials.sku_cogs
                SET cogs_cost = $1, is_mapped = true, updated_at = CURRENT_TIMESTAMP
                WHERE sku_id = $2
            `, [cogs_cost, sku_id]);
        }

        return NextResponse.json({ success: true, message: `Successfully updated ${skus.length} SKU sourcing costs.` });
    } catch (e: any) {
        console.error('[COGS API PUT Error]:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
