import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: List all API keys (Admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const res = await query(`
            SELECT 
                id, 
                name, 
                key_prefix, 
                company_access, 
                created_by, 
                is_active, 
                to_char(last_used_at, 'YYYY-MM-DD HH24:MI:SS') as last_used_at, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM credentials.api_keys
            ORDER BY created_at DESC
        `);

        return NextResponse.json({ success: true, keys: res.rows });
    } catch (err: any) {
        console.error('[api/system/api-keys GET] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST: Generate a new API key (Admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { name, company_access = 'ALL' } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'System / client name is required' }, { status: 400 });
        }

        const validAccess = ['ALL', 'HIMWELLNESS', 'WEROCA'].includes(company_access) ? company_access : 'ALL';

        // Generate new API key
        const rawKey = `mk_live_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = `${rawKey.slice(0, 16)}...`;
        const creatorName = session.user?.name || session.user?.email || 'admin';

        const insertRes = await query(`
            INSERT INTO credentials.api_keys (name, key_prefix, key_hash, company_access, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, key_prefix, company_access, created_by, is_active, created_at
        `, [name.trim(), keyPrefix, keyHash, validAccess, creatorName]);

        const createdRecord = insertRes.rows[0];

        return NextResponse.json({
            success: true,
            apiKey: rawKey, // Exposed once at creation time!
            record: createdRecord
        });
    } catch (err: any) {
        console.error('[api/system/api-keys POST] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// PATCH: Toggle active / revoke key
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { id, is_active } = body;

        if (!id || typeof is_active !== 'boolean') {
            return NextResponse.json({ success: false, error: 'id and is_active boolean required' }, { status: 400 });
        }

        await query(`
            UPDATE credentials.api_keys
            SET is_active = $1
            WHERE id = $2
        `, [is_active, id]);

        return NextResponse.json({ success: true, message: `Key ${id} updated` });
    } catch (err: any) {
        console.error('[api/system/api-keys PATCH] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// DELETE: Delete key permanently
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Key id required' }, { status: 400 });
        }

        await query('DELETE FROM credentials.api_keys WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: `Key ${id} deleted` });
    } catch (err: any) {
        console.error('[api/system/api-keys DELETE] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
