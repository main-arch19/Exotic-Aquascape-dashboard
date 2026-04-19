import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { sendPushNotification } from '@/lib/onesignal';

export async function POST(req: NextRequest) {
  const { jobId, workerId } = await req.json();

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
