import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { triggerTracking, triggerUpdate } from '@/lib/pusher-server';
import { newId, requireDispatcher } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  jobId: z.string().min(1).max(64),
  workerId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireDispatcher();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { jobId, workerId } = parsed.data;

    // Two clients, deliberately. Service role for the RLS-disabled 001-era
    // tables; the SESSION client for field_trips, because migration 006 forbids
    // service-role there and its update policy already allows manager/ceo.
    const supabase = await createServiceRoleClient();
    const session = await createClient();

    const { data: assignment } = await supabase
      .from('jobs_workers')
      .select('worker_id, accepted_at')
      .eq('job_id', jobId)
      .eq('worker_id', workerId)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { data: worker } = await supabase
      .from('users')
      .select('name')
      .eq('id', workerId)
      .maybeSingle();

    const { error: delError } = await supabase
      .from('jobs_workers')
      .delete()
      .eq('job_id', jobId)
      .eq('worker_id', workerId);
    if (delError) {
      console.error('Error unassigning worker:', delError);
      return NextResponse.json({ error: 'Failed to unassign' }, { status: 500 });
    }

    // If they had accepted, they may be driving right now. End the trip so we
    // stop collecting location for work they are no longer doing.
    let endedTripId: string | null = null;
    if (assignment.accepted_at) {
      const endedAt = new Date().toISOString();
      const { data: endedTrip } = await session
        .from('field_trips')
        .update({ status: 'ended', ended_at: endedAt, end_reason: 'manager' })
        .eq('worker_id', workerId)
        .eq('job_id', jobId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();

      if (endedTrip) {
        endedTripId = endedTrip.id;
        after(() =>
          triggerTracking('trip-ended', {
            tripId: endedTrip.id,
            workerId,
            endedAt,
            endReason: 'manager',
          })
        );
      }

      // Only clear the pointer if it still refers to this job.
      await supabase
        .from('worker_statuses')
        .update({ job_state: 'idle', current_job_id: null })
        .eq('worker_id', workerId)
        .eq('current_job_id', jobId);
    }

    const { error: logError } = await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: new Date().toISOString(),
      type: 'job_unassigned',
      worker_id: workerId,
      worker_name: worker?.name ?? workerId,
      message: `${me.name} removed ${worker?.name ?? 'an agent'} from this job`,
      job_id: jobId,
      severity: 'warning',
    });
    if (logError) console.error('Error writing job_unassigned log:', logError);

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, endedTripId });
  } catch (error) {
    console.error('Error in jobs/unassign:', error);
    return NextResponse.json({ error: 'Failed to unassign' }, { status: 500 });
  }
}
