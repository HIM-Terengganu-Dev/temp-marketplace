import { NextResponse } from 'next/server';
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    calculateEventMetrics,
} from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        const events = await getAllEvents();

        if (events.length === 0) {
            return NextResponse.json({
                success: true,
                events: [],
                selectedEvent: null,
                metrics: null,
            });
        }

        const targetEvent = eventId ? events.find((e) => e.id === eventId) || events[0] : events[0];

        const metrics = await calculateEventMetrics(targetEvent);

        return NextResponse.json({
            success: true,
            events,
            selectedEvent: targetEvent,
            metrics,
        });
    } catch (err: any) {
        console.error('[api/centralised-data/events] GET error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to fetch event analysis data' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, startDate, endDate, targetAmount, platform, departments, customCosts, notes, platformCostRate } = body;

        if (!name || !startDate || !endDate) {
            return NextResponse.json(
                { success: false, error: 'Event name, start date, and end date are required' },
                { status: 400 }
            );
        }

        const newEvent = await createEvent({
            name,
            startDate,
            endDate,
            targetAmount: parseFloat(targetAmount) || 0,
            platform: platform || 'combine',
            departments: departments || ['marketing', 'livehost', 'affiliate', 'orders'],
            customCosts: Array.isArray(customCosts) ? customCosts : [],
            notes: notes || '',
            platformCostRate: platformCostRate !== undefined ? parseFloat(platformCostRate) : 25,
        });

        const metrics = await calculateEventMetrics(newEvent);

        return NextResponse.json({
            success: true,
            event: newEvent,
            metrics,
        });
    } catch (err: any) {
        console.error('[api/centralised-data/events] POST error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to create event' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, startDate, endDate, targetAmount, platform, departments, customCosts, notes, platformCostRate } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Event ID is required for update' },
                { status: 400 }
            );
        }

        const updated = await updateEvent(id, {
            name,
            startDate,
            endDate,
            targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : undefined,
            platform,
            departments,
            customCosts,
            notes,
            platformCostRate: platformCostRate !== undefined ? parseFloat(platformCostRate) : undefined,
        });

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Event not found or failed to update' },
                { status: 404 }
            );
        }

        const metrics = await calculateEventMetrics(updated);

        return NextResponse.json({
            success: true,
            event: updated,
            metrics,
        });
    } catch (err: any) {
        console.error('[api/centralised-data/events] PUT error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to update event' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');

        if (!id) {
            const body = await request.json().catch(() => ({}));
            id = body.id;
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Event ID is required for deletion' },
                { status: 400 }
            );
        }

        const success = await deleteEvent(id);
        return NextResponse.json({ success });
    } catch (err: any) {
        console.error('[api/centralised-data/events] DELETE error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to delete event' },
            { status: 500 }
        );
    }
}
