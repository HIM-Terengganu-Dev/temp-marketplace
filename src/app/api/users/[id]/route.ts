import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { name, email, password, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features } = await request.json();

        // 1. Build dynamic update query
        let queryText = 'UPDATE credentials.users SET ';
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            queryText += `name = $${paramIndex}, `;
            queryParams.push(name);
            paramIndex++;
        }
        if (email !== undefined) {
            queryText += `email = $${paramIndex}, `;
            queryParams.push(email);
            paramIndex++;
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            queryText += `password = $${paramIndex}, `;
            queryParams.push(hashedPassword);
            paramIndex++;
        }
        if (role !== undefined) {
            queryText += `role = $${paramIndex}, `;
            queryParams.push(role);
            paramIndex++;
        }
        if (allowed_tiktok_shops !== undefined) {
            queryText += `allowed_tiktok_shops = $${paramIndex}, `;
            queryParams.push(allowed_tiktok_shops);
            paramIndex++;
        }
        if (allowed_shopee_shops !== undefined) {
            queryText += `allowed_shopee_shops = $${paramIndex}, `;
            queryParams.push(allowed_shopee_shops);
            paramIndex++;
        }
        if (allowed_features !== undefined) {
            queryText += `allowed_features = $${paramIndex}, `;
            queryParams.push(allowed_features);
            paramIndex++;
        }

        // Remove trailing comma and space
        queryText = queryText.slice(0, -2);
        queryText += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, allowed_tiktok_shops, allowed_shopee_shops, allowed_features`;
        queryParams.push(id);

        const result = await query(queryText, queryParams);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        
        // Prevent deleting oneself
        if (id === (session.user as any).id) {
            return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 });
        }

        const result = await query(
            'DELETE FROM credentials.users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
