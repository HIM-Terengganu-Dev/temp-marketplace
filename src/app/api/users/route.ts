import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await query(`
            SELECT id, name, email, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features, created_at
            FROM credentials.users
            ORDER BY id ASC
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, email, password, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(`
            INSERT INTO credentials.users 
            (name, email, password, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features, created_at
        `, [
            name || '',
            email,
            hashedPassword,
            role,
            allowed_tiktok_shops || [1, 2, 3, 4],
            allowed_shopee_shops || [1298030530, 1077500606, 1256177782, 1285322524, 1290223366, 1245549673, 793855746, 562396517],
            allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"]
        ]);

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        if (error.message.includes('unique constraint')) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
