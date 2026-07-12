import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { db } from '@/lib/mock-db';
import { sendPushNotification } from '@/lib/onesignal';

export async function POST(req: NextRequest) {
  const { jobId, workerId } = await req.json();

  try {
    const supabase = await createServiceRoleClient();

    // Get job and worker from Supabase (with fallback to mock)
    const jobRes = await supabase.from('jobs').select('*').eq('id', jobId).single();
    const workerRes = await supabase
      .from('worker_statuses')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    const job = jobRes.data || db.getJob(jobId);
    const workerStatus = workerRes.data || db.getWorkerStatus(workerId);

    if (!job || !workerStatus) {
      return NextResponse.json({ error: 'Job or worker not found' }, { status: 404 });
    }

    const homeownerName = 'homeowner_name' in job ? job.homeowner_name : job.homeownerName;
    const address = 'address' in job ? job.address : job.address;
    const workerName = workerStatus.worker_name || workerStatus.workerName;

    // Update in Supabase
    if (jobRes.data) {
      await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId);
    }

    if (workerRes.data) {
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
        message: `${workerName} completed job at ${address} — leaving site`,
        job_id: jobId,
        severity: 'info',
      });
    }

    // Always update mock for consistency
    const mockJob = db.getJob(jobId);
    if (mockJob) db.setJobStatus(jobId, 'completed');

    const mockWs = db.getWorkerStatus(workerId);
    if (mockWs) {
      mockWs.jobState = 'leaving';

      db.addEvent({
        type: 'leaving',
        workerId,
        workerName: mockWs.workerName,
        message: `${mockWs.workerName} completed job at ${mockJob?.address} — leaving site`,
        jobId,
        severity: 'info',
      });
    }

    // Send OneSignal notification
    await sendPushNotification(
      'Job complete — your Exotic Aquascape team is on their way out. Thank you! 🌊',
      homeownerName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in jobs/leave:', error);
    // Fall back to mock entirely
    const job = db.getJob(jobId);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const ws = db.getWorkerStatus(workerId);
    if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    db.setJobStatus(jobId, 'completed');
    ws.jobState = 'leaving';

    db.addEvent({
      type: 'leaving',
      workerId,
      workerName: ws.workerName,
      message: `${ws.workerName} completed job at ${job.address} — leaving site`,
      jobId,
      severity: 'info',
    });

    await sendPushNotification(
      'Job complete — your Exotic Aquascape team is on their way out. Thank you! 🌊',
      job.homeownerName
    );

    return NextResponse.json({ success: true });
  }
}
