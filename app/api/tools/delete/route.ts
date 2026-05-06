import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { toolId } = await req.json();
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 });
  const ok = db.removeTool(toolId);
  if (!ok) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
