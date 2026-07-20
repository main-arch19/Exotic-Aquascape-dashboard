// The push is awaited rather than deferred to after(): assign is a low-frequency
// dispatcher action, not a hot path, and the caller needs `delivered` in the
// response to know whether the agent actually got notified.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';
import { sendPushNotification } from '@/lib/onesignal';
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

    // Service role: jobs/jobs_workers/users have RLS disabled, so this is the
    // established pattern for them. Tracking tables must NEVER use this client.
    const supabase = await createServiceRoleClient();

    const { data: job } = await supabase
      .from('jobs')
      .select('id, homeowner_name, address, status')
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

    const { data: worker } = await supabase
      .from('users')
      .select('id, name, role, approved, revoked')
      .eq('id', workerId)
      .maybeSingle();
    if (!worker) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Only field agents. A manager sitting in jobs_workers would receive an
    // assignment push, get an Accept button, and start GPS tracking on
    // themselves — the owning manager belongs in jobs.manager_id instead.
    if (worker.role !== 'worker' || !worker.approved || worker.revoked) {
      return NextResponse.json(
        { error: 'Only approved field agents can be assigned to a job' },
        { status: 400 }
      );
    }

    const { error: upsertError } = await supabase
      .from('jobs_workers')
      .upsert(
        { job_id: jobId, worker_id: workerId },
        { onConflict: 'job_id,worker_id', ignoreDuplicates: true }
      );
    if (upsertError) {
      console.error('Error assigning worker:', upsertError);
      return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
    }

    // Guarded on accepted_at IS NULL so re-assigning someone who has already
    // accepted is a no-op rather than a silent un-acceptance mid-drive.
    await supabase
      .from('jobs_workers')
      .update({ assigned_at: new Date().toISOString(), assigned_by: me.id })
      .eq('job_id', jobId)
      .eq('worker_id', workerId)
      .is('accepted_at', null);

    // worker_id is the SUBJECT of the event so the feed filters by agent and the
    // FK holds. Who did the assigning is recorded structurally in assigned_by.
    const { error: logError } = await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: new Date().toISOString(),
      type: 'job_assigned',
      worker_id: workerId,
      worker_name: worker.name,
      message: `${me.name} assigned ${worker.name} to ${job.homeowner_name} at ${job.address}`,
      job_id: jobId,
      severity: 'info',
    });
    if (logError) console.error('Error writing job_assigned log:', logError);

    const push = await sendPushNotification({
      message: `New job: ${job.homeowner_name}, ${job.address}. Open the app to accept.`,
      heading: 'You have been assigned a job',
      externalUserIds: [workerId],
      data: { jobId },
    });

    await triggerUpdate('state-changed');

    // pushDelivered lets the dispatcher see that the agent has notifications
    // off, so they know to phone them instead.
    return NextResponse.json({ success: true, pushDelivered: push.delivered });
  } catch (error) {
    console.error('Error in jobs/assign:', error);
    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
  }
}
