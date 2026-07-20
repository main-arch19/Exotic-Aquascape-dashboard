import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { triggerTracking, triggerUpdate } from '@/lib/pusher-server';
import { startTrip } from '@/lib/tracking/startTrip';
import { CONSENT_VERSION } from '@/lib/tracking/types';
import { tripRowToDTO, type TripRow } from '@/app/api/trips/shared';
import { newId, requireApproved } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  jobId: z.string().min(1).max(64),
  noticeVersion: z.string().min(1).max(16),
});

/**
 * An agent accepts a job assigned to them, which opens a field_trip and starts
 * location sharing.
 *
 * This MUST be worker-initiated. The field_trips_insert policy in migration 006
 * requires `worker_id = auth.uid()::text`, and 006 forbids service-role on
 * tracking tables — so a manager physically cannot open a trip on an agent's
 * behalf. That constraint is the feature, not an obstacle.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireApproved();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    if (me.role !== 'worker') {
      return NextResponse.json(
        { error: 'Only field agents accept jobs' },
        { status: 403 }
      );
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { jobId, noticeVersion } = parsed.data;

    // A stale tab would otherwise record acknowledgment of notice text the agent
    // was never shown. This check is the only thing that keeps consent_version
    // meaningful.
    if (noticeVersion !== CONSENT_VERSION) {
      return NextResponse.json(
        { error: 'The location notice has been updated — reload the app' },
        { status: 409 }
      );
    }

    // Service role for the RLS-disabled 001-era tables; the session client for
    // field_trips. Do not cross these over.
    const supabase = await createServiceRoleClient();
    const session = await createClient();

    const { data: assignment } = await supabase
      .from('jobs_workers')
      .select('accepted_at')
      .eq('job_id', jobId)
      .eq('worker_id', me.id)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json(
        { error: 'This job is not assigned to you' },
        { status: 403 }
      );
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, address, status')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'That job is already completed' },
        { status: 409 }
      );
    }

    // Punch gate, failing CLOSED. The old check was `=== 'clocked_out'`, which
    // passed for a worker with no worker_statuses row at all — i.e. the exact
    // population that cannot be clocked in. Migration 007 guarantees the row
    // exists; this comparison makes absence a denial regardless.
    //
    // Deliberately does NOT auto-punch-in: clocking someone in as a side effect
    // of a different action is how payroll disputes start.
    const { data: workerStatus } = await supabase
      .from('worker_statuses')
      .select('punch_status')
      .eq('worker_id', me.id)
      .maybeSingle();

    if (workerStatus?.punch_status !== 'clocked_in') {
      return NextResponse.json(
        { error: 'Clock in before accepting a job' },
        { status: 409 }
      );
    }

    // Idempotent. Re-accepting an already-accepted job returns the running trip
    // — and re-opens one if it is missing, which is the punch-out-then-back-in
    // "Resume" path.
    if (assignment.accepted_at) {
      const { data: existing } = await session
        .from('field_trips')
        .select('*')
        .eq('worker_id', me.id)
        .eq('status', 'active')
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          success: true,
          trip: tripRowToDTO(existing as TripRow),
          resumed: true,
        });
      }
    }

    const result = await startTrip({
      supabase: session,
      me,
      jobId,
      destination: job.address,
      consentVersion: noticeVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { trip } = result;

    const acceptedAt = new Date().toISOString();
    if (!assignment.accepted_at) {
      await supabase
        .from('jobs_workers')
        .update({ accepted_at: acceptedAt })
        .eq('job_id', jobId)
        .eq('worker_id', me.id)
        .is('accepted_at', null);
    }

    // job_state 'pending' renders as the "Dispatched" badge that already exists
    // in WorkerStatusGrid/FieldWorkersSection. Setting current_job_id here (not
    // only on arrive) is also what lets a delay reported EN ROUTE attach to the
    // right job.
    await supabase
      .from('worker_statuses')
      .update({ job_state: 'pending', current_job_id: jobId })
      .eq('worker_id', me.id);

    const logs = [
      {
        id: newId(),
        timestamp: acceptedAt,
        type: 'job_accepted',
        worker_id: me.id,
        worker_name: me.name,
        message: `${me.name} accepted the job at ${job.address} and is heading out`,
        job_id: jobId,
        severity: 'success',
      },
      {
        id: newId(),
        timestamp: acceptedAt,
        type: 'trip_started',
        worker_id: me.id,
        worker_name: me.name,
        message: `${me.name} started sharing location en route to ${job.address}`,
        job_id: jobId,
        severity: 'info',
      },
    ];
    const { error: logError } = await supabase.from('event_logs').insert(logs);
    if (logError) console.error('Error writing acceptance logs:', logError);

    after(() => triggerTracking('trip-started', { trip }));
    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, trip, resumed: false });
  } catch (error) {
    console.error('Error in jobs/accept:', error);
    return NextResponse.json({ error: 'Failed to accept job' }, { status: 500 });
  }
}
