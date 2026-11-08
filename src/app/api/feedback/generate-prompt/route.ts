import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateAgentPromptForFeedback } from '@/lib/feedback-ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Feedback ticket ID is required' },
                { status: 400 }
            );
        }

        const checkRes = await query(`SELECT * FROM system_feedback WHERE id = $1`, [id]);
        if (checkRes.rowCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Feedback ticket not found' },
                { status: 404 }
            );
        }

        const item = checkRes.rows[0];

        const prompt = await generateAgentPromptForFeedback({
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            page_url: item.page_url,
            priority: item.priority,
            sender_name: item.sender_name
        });

        const updateRes = await query(
            `UPDATE system_feedback 
             SET agent_prompt = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [prompt, item.id]
        );

        return NextResponse.json({
            success: true,
            data: updateRes.rows[0],
            message: 'AI agent prompt generated successfully'
        });
    } catch (error: any) {
        console.error('Error generating AI prompt for feedback:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate AI prompt' },
            { status: 500 }
        );
    }
}
