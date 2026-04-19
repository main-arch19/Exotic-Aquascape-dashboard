import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { Job } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { homeownerName, address, scheduledTime, assignedWorkerIds } = body;

  if (!homeownerName || !address || !scheduledTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const job: Job = {
    id: Math.random().toString(36).slice(2, 10),
    homeownerName,
    address,
    scheduledTime,
    assignedWorkerIds: assignedWorkerIds ?? [],
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  db.jobs.unshift(job);

  // Update assigned workers' pending state
  for (const wId of job.assignedWorkerIds) {
    const ws = db.getWorkerStatus(wId);
    if (ws && ws.jobState === 'idle') {
      ws.jobState = 'pending';
      ws.currentJobId = job.id;
    }
  }

  const assignedNames = job.assignedWorkerIds
    .map((id) => db.getWorkerStatus(id)?.workerName)
    .filter(Boolean)
    .join(', ');

  db.addEvent({
    type: 'job_created',
    workerId: 'system',
    workerName: 'System',
    message: `New job created for ${homeownerName} at ${address}${assignedNames ? ` — assigned to ${assignedNames}` : ''}`,
    jobId: job.id,
    severity: 'info',
  });

  return NextResponse.json({ success: true, job });
}
