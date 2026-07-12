import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/onesignal';

export async function POST(req: NextRequest) {
  const { jobId, workerId } = await req.json();

  try {
    const supabase = await createServiceRoleClient();

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
    await supabase
      .from('worker_statuses')
      .update({ job_state: 'leaving' })
      .eq('worker_id', workerId);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type: 'leaving',
      worker_id: workerId,
      worker_name: workerName,
      message: `${workerName} completed job at ${job.address} — leaving site`,
      job_id: jobId,
      severity: 'info',
    });

    await sendPushNotification(
      'Job complete — your Exotic Aquascape team is on their way out. Thank you! 🌊',
      job.homeowner_name
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in jobs/leave:', error);
    return NextResponse.json(
      { error: 'Failed to complete job' },
      { status: 500 }
    );
  }
}
