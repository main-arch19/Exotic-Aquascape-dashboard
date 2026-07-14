import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  // Surface missing config directly — createServiceRoleClient() would otherwise
  // throw a cryptic "supabaseUrl is required" that gets flattened into a generic 500.
  const missing = (['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const)
    .filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing Supabase env vars:', missing);
    return NextResponse.json(
      { error: 'Missing Supabase env vars', missing },
      { status: 500 }
    );
  }

  try {
    const supabase = await createServiceRoleClient();

    // Fetch all data from Supabase in parallel
    const [workerStatusesRes, jobsRes, toolsRes, timesheetsRes] = await Promise.all([
      supabase.from('worker_statuses').select('*'),
      supabase.from('jobs').select('*, jobs_workers(worker_id)'),
      supabase.from('tools').select('*'),
      supabase.from('timesheets').select('*'),
    ]);

    // Supabase resolves { data, error } instead of throwing — a failed query would
    // otherwise be swallowed into an empty array and returned as a misleading 200.
    const queryError =
      (workerStatusesRes.error && `worker_statuses: ${workerStatusesRes.error.message}`) ||
      (jobsRes.error && `jobs: ${jobsRes.error.message}`) ||
      (toolsRes.error && `tools: ${toolsRes.error.message}`) ||
      (timesheetsRes.error && `timesheets: ${timesheetsRes.error.message}`);
    if (queryError) throw new Error(queryError);

    const workerStatuses = (workerStatusesRes.data || []).map((w: any) => ({
      workerId: w.worker_id,
      workerName: w.worker_name,
      punchStatus: w.punch_status,
      jobState: w.job_state,
      currentJobId: w.current_job_id ?? undefined,
      location: w.location ?? undefined,
    }));

    const jobs = (jobsRes.data || []).map((job: any) => ({
      id: job.id,
      homeownerName: job.homeowner_name,
      address: job.address,
      scheduledTime: job.scheduled_time,
      status: job.status,
      createdAt: job.created_at,
      homeownerEmail: job.homeowner_email ?? undefined,
      assignedWorkerIds: job.jobs_workers?.map((jw: any) => jw.worker_id) || [],
    }));

    const tools = (toolsRes.data || []).map((tool: any) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      status: tool.status,
      checkedOutById: tool.checked_out_by_id ?? undefined,
      checkedOutByName: tool.checked_out_by_name ?? undefined,
      checkedOutAt: tool.checked_out_at ?? undefined,
    }));

    const timesheets = (timesheetsRes.data || []).map((t: any) => ({
      id: t.id,
      workerId: t.worker_id,
      workerName: t.worker_name,
      punchIn: t.punch_in,
      punchOut: t.punch_out ?? undefined,
      totalHours: t.total_hours ?? undefined,
    }));

    // Calculate KPIs from real data
    const activeJobs = jobs.filter((j) => j.status === 'in_progress').length;
    const toolsCheckedOut = tools.filter((t) => t.status === 'checked_out').length;
    const delaysToday = jobs.filter((j) => j.status === 'delayed').length;

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
      {
        error: 'Failed to fetch state',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
