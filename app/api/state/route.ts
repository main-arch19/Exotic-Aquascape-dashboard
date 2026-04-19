import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function GET() {
  return NextResponse.json({
    workerStatuses: db.workerStatuses,
    jobs: db.jobs,
    tools: db.tools,
    timesheets: db.timesheets,
    kpis: db.getKPIs(),
  });
}
