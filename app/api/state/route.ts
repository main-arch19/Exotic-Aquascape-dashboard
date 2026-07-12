import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { db } from '@/lib/mock-db';

export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    // Fetch all data from Supabase in parallel
    const [workerStatusesRes, jobsRes, toolsRes, timesheetsRes] = await Promise.all([
      supabase.from('worker_statuses').select('*'),
      supabase.from('jobs').select('*, jobs_workers(worker_id)'),
      supabase.from('tools').select('*'),
      supabase.from('timesheets').select('*'),
    ]);

    // If Supabase has data, use it; otherwise fall back to mock
    const workerStatuses = workerStatusesRes.data?.length
      ? workerStatusesRes.data
      : db.workerStatuses;

    const jobs = jobsRes.data?.length
      ? jobsRes.data.map((job: any) => ({
          ...job,
          assignedWorkerIds: job.jobs_workers?.map((jw: any) => jw.worker_id) || [],
        }))
      : db.jobs;

    const tools = toolsRes.data?.length ? toolsRes.data : db.tools;
    const timesheets = timesheetsRes.data?.length ? timesheetsRes.data : db.timesheets;

    return NextResponse.json({
      workerStatuses,
      jobs,
      tools,
      timesheets,
      kpis: db.getKPIs(), // KPI logic stays in mock for now
    });
  } catch (error) {
    console.error('Error fetching state from Supabase:', error);
    // Fall back to mock on error
    return NextResponse.json({
      workerStatuses: db.workerStatuses,
      jobs: db.jobs,
      tools: db.tools,
      timesheets: db.timesheets,
      kpis: db.getKPIs(),
    });
  }
}
