import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { toolId, name, category } = await req.json();
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 });
  const tool = db.updateTool(toolId, { name: name?.trim(), category: category?.trim() });
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  return NextResponse.json({ success: true, tool });
}
