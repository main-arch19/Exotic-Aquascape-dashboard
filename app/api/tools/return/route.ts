import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { workerId, toolId } = await req.json();

  const ws = db.getWorkerStatus(workerId);
  if (!ws) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

  const tool = db.getTool(toolId);
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  if (tool.status === 'available') {
    return NextResponse.json({ error: 'Tool is already available' }, { status: 400 });
  }

  const prevHolder = tool.checkedOutByName ?? ws.workerName;
  db.setToolStatus(toolId, 'available');

  db.addEvent({
    type: 'tool_return',
    workerId,
    workerName: ws.workerName,
    message: `${prevHolder} returned ${tool.name}`,
    severity: 'info',
  });

  return NextResponse.json({ success: true, tool });
}
