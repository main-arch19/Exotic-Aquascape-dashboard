import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function GET() {
  // Return newest-first, capped at 30
  const events = db.events.slice(0, 30);
  return NextResponse.json({ events });
}
