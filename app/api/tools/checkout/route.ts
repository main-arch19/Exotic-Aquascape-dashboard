import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { workerId, toolId } = await req.json();

  const ws = db.getWorkerStatus(workerId);
  if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

  const tool = db.getTool(toolId);
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  if (tool.status === 'checked_out') {
    return NextResponse.json({ error: 'Tool already checked out' }, { status: 400 });
  }

  db.setToolStatus(toolId, 'checked_out', { id: workerId, name: ws.workerName });

  db.addEvent({
    type: 'tool_checkout',
    workerId,
    workerName: ws.workerName,
    message: `${ws.workerName} checked out ${tool.name}`,
    severity: 'info',
  });

  return NextResponse.json({ success: true, tool });
}
