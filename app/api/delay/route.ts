import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { workerId, reason } = await req.json();

  try {
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
    const jobId = workerRes.data.current_job_id;

    await supabase
      .from('worker_statuses')
      .update({ job_state: 'delayed' })
      .eq('worker_id', workerId);

    if (jobId) {
      await supabase.from('jobs').update({ status: 'delayed' }).eq('id', jobId);
    }

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: now,
      type: 'delayed',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${workerRes.data.worker_name} reported delay: ${reason}`,
      job_id: jobId,
      severity: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reporting delay:', error);
    return NextResponse.json({ error: 'Failed to report delay' }, { status: 500 });
  }
}
