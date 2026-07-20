import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';
import { newId, requireApproved, resolveTarget } from '@/app/api/jobs/shared';

export async function POST(req: NextRequest) {
  const { workerId: bodyWorkerId, reason } = await req.json();

  try {
    const guard = await requireApproved();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    const workerId = resolveTarget(me, bodyWorkerId);

    const supabase = await createServiceRoleClient();

    const workerRes = await supabase
      .from('worker_statuses')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (!workerRes.data) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    // current_job_id is now set on ACCEPT, not only on arrive, so a delay
    // reported while still en route finally attaches to the right job.
    const jobId = workerRes.data.current_job_id;

    await supabase
      .from('worker_statuses')
      .update({ job_state: 'delayed' })
      .eq('worker_id', workerId);

    if (jobId) {
      await supabase.from('jobs').update({ status: 'delayed' }).eq('id', jobId);
    }

    // The trip deliberately keeps running. A delayed agent is precisely the one
    // a manager wants to see moving on the map.

    await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: now,
      type: 'delayed',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${workerRes.data.worker_name} reported delay: ${reason}`,
      job_id: jobId,
      severity: 'warning',
    });

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reporting delay:', error);
    return NextResponse.json({ error: 'Failed to report delay' }, { status: 500 });
  }
}
