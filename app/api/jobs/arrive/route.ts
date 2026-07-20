import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';
import { triggerUpdate } from '@/lib/pusher-server';
import { newId, requireApproved, resolveTarget } from '../shared';

export async function POST(req: NextRequest) {
  const { jobId, workerId: bodyWorkerId, location } = await req.json();

  try {
    const guard = await requireApproved();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    // An agent can only act as themselves; a manager may record an arrival for a
    // named agent (useful when the agent's phone has died).
    const workerId = resolveTarget(me, bodyWorkerId);

    const supabase = await createServiceRoleClient();

    // The job must actually be assigned to and accepted by this agent. Without
    // this an agent could mark anyone's job arrived.
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

    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId);
    await supabase
      .from('worker_statuses')
      .update({
        job_state: 'arrived',
        current_job_id: jobId,
        location: location || null,
      })
      .eq('worker_id', workerId);

    await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: new Date().toISOString(),
      type: 'arrived',
      worker_id: workerId,
      worker_name: workerName,
      message: `${workerName} arrived at ${location || job.homeowner_name}`,
      job_id: jobId,
      severity: 'success',
    });

    // The homeowner push was removed: sendPushNotification had no targeting, so
    // OneSignal fell back to the default segment and every "your team has
    // arrived" went to every subscriber. Homeowners are not users and have no
    // OneSignal identity, so there is no correct target — the email below is
    // the properly addressed channel.
    if (job.homeowner_email) {
      await sendEmail(
        job.homeowner_email,
        'Your Exotic Aquascape team has arrived',
        `<p>Hi ${job.homeowner_name},</p><p>Your Exotic Aquascape cleaning team has arrived at ${location || job.address}!</p><p>We'll have your aquascape looking beautiful soon.</p>`
      );
    }

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in jobs/arrive:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}
