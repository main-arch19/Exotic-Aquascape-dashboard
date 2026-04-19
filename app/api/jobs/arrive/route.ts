import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { sendPushNotification } from '@/lib/onesignal';

export async function POST(req: NextRequest) {
  const { jobId, workerId, location } = await req.json();

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
