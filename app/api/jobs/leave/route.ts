import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';
import { triggerTracking, triggerUpdate } from '@/lib/pusher-server';
import { newId, requireApproved, resolveTarget } from '../shared';

export async function POST(req: NextRequest) {
  const { jobId, workerId: bodyWorkerId } = await req.json();

  try {
    const guard = await requireApproved();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    const workerId = resolveTarget(me, bodyWorkerId);

    // Service role for the RLS-disabled 001-era tables; the SESSION client for
    // field_trips (migration 006 forbids service-role there). Its update policy
    // passes for the owning worker AND for manager/ceo, so both callers work
    // through the same code path.
    const supabase = await createServiceRoleClient();
    const session = await createClient();

    const { data: assignment } = await supabase
      .from('jobs_workers')
      .select('accepted_at')
      .eq('job_id', jobId)
      .eq('worker_id', workerId)
      .maybeSingle();
    if (!assignment?.accepted_at) {
      return NextResponse.json(
        { error: 'That job has not been accepted by this agent' },
        { status: 403 }
      );
    }

    const jobRes = await supabase.from('jobs').select('*').eq('id', jobId).single();
    const workerRes = await supabase
      .from('worker_statuses')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (!jobRes.data || !workerRes.data) {
      return NextResponse.json({ error: 'Job or worker not found' }, { status: 404 });
    }

    const job = jobRes.data;
    const workerName = workerRes.data.worker_name;

    await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId);
    // current_job_id is cleared here — it never used to be, which is why a delay
    // reported later could attach itself to a long-finished job.
    await supabase
      .from('worker_statuses')
      .update({ job_state: 'leaving', current_job_id: null })
      .eq('worker_id', workerId);

    await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: new Date().toISOString(),
      type: 'leaving',
      worker_id: workerId,
      worker_name: workerName,
      message: `${workerName} completed job at ${job.address} — leaving site`,
      job_id: jobId,
      severity: 'info',
    });

    // Completing the job is what ends location sharing.
    //
    // Deliberately NON-FATAL: if this fails we log it and still report the job
    // complete. A GPS bookkeeping error must never block "I finished the job" —
    // the monitor's stale detection and manager force-end cover the orphan.
    const endedAt = new Date().toISOString();
    try {
      const { data: endedTrip, error: tripError } = await session
        .from('field_trips')
        .update({
          status: 'ended',
          ended_at: endedAt,
          end_reason: me.id === workerId ? 'worker' : 'manager',
        })
        .eq('worker_id', workerId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();

      if (tripError) {
        console.error('Failed to end trip on job completion:', tripError);
      } else if (endedTrip) {
        await supabase.from('event_logs').insert({
          id: newId(),
          timestamp: endedAt,
          type: 'trip_ended',
          worker_id: workerId,
          worker_name: workerName,
          message: `${workerName} stopped sharing location — job complete`,
          job_id: jobId,
          severity: 'info',
        });
        after(() =>
          triggerTracking('trip-ended', {
            tripId: endedTrip.id,
            workerId,
            endedAt,
            endReason: me.id === workerId ? 'worker' : 'manager',
          })
        );
      }
    } catch (tripError) {
      console.error('Failed to end trip on job completion:', tripError);
    }

    // Homeowner push removed — see the note in jobs/arrive. Email is targeted.
    if (job.homeowner_email) {
      await sendEmail(
        job.homeowner_email,
        'Your Exotic Aquascape job is complete',
        `<p>Hi ${job.homeowner_name},</p><p>Your Exotic Aquascape cleaning job at ${job.address} is complete!</p><p>Our team is heading out now. Thank you for choosing us! 🐠</p>`
      );
    }

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in jobs/leave:', error);
    return NextResponse.json(
      { error: 'Failed to complete job' },
      { status: 500 }
    );
  }
}
