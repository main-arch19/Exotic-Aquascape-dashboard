import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  const { name, category } = await req.json();
  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
  }
  const tool = db.addTool(name.trim(), category.trim());
  return NextResponse.json({ success: true, tool });
}
