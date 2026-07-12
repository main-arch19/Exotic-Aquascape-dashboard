import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/onesignal';
import { sendEmail } from '@/lib/resend';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { jobId, workerId, location } = await req.json();

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
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type: 'arrived',
      worker_id: workerId,
      worker_name: workerName,
      message: `${workerName} arrived at ${location || job.homeowner_name}`,
      job_id: jobId,
      severity: 'success',
    });

    await sendPushNotification(
      'Your Exotic Aquascape cleaning team has arrived! 🐠',
      job.homeowner_name
    );

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
