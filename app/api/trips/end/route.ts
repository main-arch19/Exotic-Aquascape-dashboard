import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { triggerTracking } from '@/lib/pusher-server';
import { tripRowToDTO, type TripRow } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  tripId: z.string().min(1).max(64),
  reason: z.enum(['worker', 'manager']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!me.approved) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { tripId, reason } = parsed.data;

    const supabase = await createClient();
    const endedAt = new Date().toISOString();

    // The field_trips_update policy allows the owning worker OR any
    // manager/CEO, so a manager force-ending a stuck trip is this same code
    // path — no separate admin route. A worker who is not the owner matches no
    // row and gets the 404 below.
    const { data: updated, error } = await supabase
      .from('field_trips')
      .update({
        status: 'ended',
        ended_at: endedAt,
        end_reason: reason ?? 'worker',
      })
      .eq('id', tripId)
      .eq('status', 'active')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error ending trip:', error);
      return NextResponse.json({ error: 'Failed to end trip' }, { status: 500 });
    }
    if (!updated) {
      // Either already ended, or not visible to this caller under RLS.
      return NextResponse.json(
        { error: 'No active trip found' },
        { status: 404 }
      );
    }

    const trip = tripRowToDTO(updated as TripRow);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: endedAt,
      type: 'trip_ended',
      worker_id: trip.workerId,
      worker_name: trip.workerName,
      message: trip.destination
        ? `${trip.workerName} ended the trip to ${trip.destination}`
        : `${trip.workerName} ended a trip`,
      job_id: trip.jobId,
      severity: 'info',
    });

    after(() =>
      triggerTracking('trip-ended', {
        tripId: trip.id,
        workerId: trip.workerId,
        endedAt,
        endReason: trip.endReason,
      })
    );

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('Error in trips/end:', error);
    return NextResponse.json({ error: 'Failed to end trip' }, { status: 500 });
  }
}
