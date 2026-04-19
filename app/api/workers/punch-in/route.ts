import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { workerId } = await req.json();

  const ws = db.getWorkerStatus(workerId);
  if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

  if (ws.punchStatus === 'clocked_in') {
    return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
  }

  db.setWorkerPunchStatus(workerId, 'clocked_in');

  const record = {
    id: Math.random().toString(36).slice(2, 10),
    workerId,
    workerName: ws.workerName,
    punchIn: new Date().toISOString(),
  };
  db.timesheets.push(record);

  db.addEvent({
    type: 'punch_in',
    workerId,
    workerName: ws.workerName,
    message: `${ws.workerName} punched in`,
    severity: 'info',
  });

  return NextResponse.json({ success: true, record });
}
