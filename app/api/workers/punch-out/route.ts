import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { workerId } = await req.json();

  const ws = db.getWorkerStatus(workerId);
  if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

  if (ws.punchStatus === 'clocked_out') {
    return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
  }

  const record = db.getOpenRecord(workerId);
  if (record) {
    record.punchOut = new Date().toISOString();
    const diffMs = new Date(record.punchOut).getTime() - new Date(record.punchIn).getTime();
    record.totalHours = Math.round((diffMs / 3_600_000) * 100) / 100;
  }

  db.setWorkerPunchStatus(workerId, 'clocked_out');
  ws.jobState = 'idle';

  db.addEvent({
    type: 'punch_out',
    workerId,
    workerName: ws.workerName,
    message: `${ws.workerName} punched out${record?.totalHours != null ? ` — ${record.totalHours}h logged` : ''}`,
    severity: 'info',
  });

  return NextResponse.json({ success: true, record });
}
