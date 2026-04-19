import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { workerId, reason } = await req.json();

  const ws = db.getWorkerStatus(workerId);
  if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

  ws.jobState = 'delayed';

  if (ws.currentJobId) {
    db.setJobStatus(ws.currentJobId, 'delayed');
  }

  db.addEvent({
    type: 'delayed',
    workerId,
    workerName: ws.workerName,
    message: `${ws.workerName} reported delay: ${reason}`,
    jobId: ws.currentJobId,
    severity: 'warning',
  });

  return NextResponse.json({ success: true });
}
