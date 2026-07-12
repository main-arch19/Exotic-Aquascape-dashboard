import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    const workerStatuses = workerStatusesRes.data || [];
    const jobs = (jobsRes.data || []).map((job: any) => ({
      ...job,
      assignedWorkerIds: job.jobs_workers?.map((jw: any) => jw.worker_id) || [],
    }));
    const tools = toolsRes.data || [];
    const timesheets = timesheetsRes.data || [];

    // Calculate KPIs from real data
    const activeJobs = jobs.filter((j: any) => j.status === 'in_progress').length;
    const toolsCheckedOut = tools.filter((t: any) => t.status === 'checked_out').length;
    const delaysToday = jobs.filter((j: any) => j.status === 'delayed').length;

    return NextResponse.json({
      workerStatuses,
      jobs,
      tools,
      timesheets,
      kpis: { activeJobs, toolsCheckedOut, delaysToday },
    });
  } catch (error) {
    console.error('Error fetching state from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch state' },
      { status: 500 }
    );
  }
}
