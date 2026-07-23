import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Fetch feedback items (supports status filter, type filter, search keyword)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const search = searchParams.get('search');

        let sql = `SELECT * FROM system_feedback WHERE 1=1`;
        const params: any[] = [];
        let paramIdx = 1;

        if (status && status !== 'All') {
            sql += ` AND status = $${paramIdx++}`;
            params.push(status);
        }

        if (type && type !== 'All') {
            sql += ` AND type = $${paramIdx++}`;
            params.push(type);
        }

        if (search) {
            sql += ` AND (title ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR sender_name ILIKE $${paramIdx} OR page_url ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching feedback:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Submit new feedback
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            type = 'improvement',
            title,
            description,
            sender_name = 'Tester',
            page_url,
            priority = 'medium'
        } = body;

        if (!title || !description) {
            return NextResponse.json(
                { success: false, error: 'Title and description are required' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO system_feedback (type, title, description, sender_name, page_url, priority)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [type, title, description, sender_name || 'Tester', page_url, priority]
        );

        return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating feedback:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: Edit feedback content
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, description, type, priority } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Feedback ID required' }, { status: 400 });
        }

        const result = await query(
            `UPDATE system_feedback 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 type = COALESCE($3, type),
                 priority = COALESCE($4, priority),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [title, description, type, priority, id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating feedback content:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Update admin status & append admin_notes
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, admin_notes } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Feedback ID required' }, { status: 400 });
        }

        const result = await query(
            `UPDATE system_feedback 
             SET status = COALESCE($1, status),
                 admin_notes = COALESCE($2, admin_notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [status, admin_notes, id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating feedback status:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete feedback entry by ID
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');

        if (!id) {
            try {
                const body = await request.json();
                id = body.id;
            } catch (e) {
                // Ignore json parse error if query param used
            }
        }

        if (!id) {
            return NextResponse.json({ success: false, error: 'Feedback ID required' }, { status: 400 });
        }

        const result = await query(`DELETE FROM system_feedback WHERE id = $1 RETURNING id`, [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Feedback deleted successfully', id: Number(id) });
    } catch (error: any) {
        console.error('Error deleting feedback:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
