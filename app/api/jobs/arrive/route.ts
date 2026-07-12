import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { db } from '@/lib/mock-db';
import { sendPushNotification } from '@/lib/onesignal';

export async function POST(req: NextRequest) {
  const { jobId, workerId, location } = await req.json();

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
    const workerName = workerStatus.worker_name || workerStatus.workerName;

    // Update in Supabase
    if (jobRes.data) {
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId);
    }

    if (workerRes.data) {
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
        message: `${workerName} arrived at ${location || homeownerName}`,
        job_id: jobId,
        severity: 'success',
      });
    }

    // Always update mock for consistency
    const mockJob = db.getJob(jobId);
    if (mockJob) db.setJobStatus(jobId, 'in_progress');

    const mockWs = db.getWorkerStatus(workerId);
    if (mockWs) {
      mockWs.jobState = 'arrived';
      mockWs.currentJobId = jobId;
      if (location) mockWs.location = location;

      db.addEvent({
        type: 'arrived',
        workerId,
        workerName: mockWs.workerName,
        message: `${mockWs.workerName} arrived at ${location ?? mockJob?.address}`,
        jobId,
        severity: 'success',
      });
    }

    // Send OneSignal notification
    await sendPushNotification(
      'Your Exotic Aquascape cleaning team has arrived! 🐠',
      homeownerName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in jobs/arrive:', error);
    // Fall back to mock entirely
    const job = db.getJob(jobId);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const ws = db.getWorkerStatus(workerId);
    if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    db.setJobStatus(jobId, 'in_progress');
    ws.jobState = 'arrived';
    ws.currentJobId = jobId;
    if (location) ws.location = location;

    db.addEvent({
      type: 'arrived',
      workerId,
      workerName: ws.workerName,
      message: `${ws.workerName} arrived at ${location ?? job.address}`,
      jobId,
      severity: 'success',
    });

    await sendPushNotification(
      'Your Exotic Aquascape cleaning team has arrived! 🐠',
      job.homeownerName
    );

    return NextResponse.json({ success: true });
  }
}
