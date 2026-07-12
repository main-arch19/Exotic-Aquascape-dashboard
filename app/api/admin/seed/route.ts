import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { db } from '@/lib/mock-db';

/**
 * One-time seed endpoint to populate Supabase with initial mock data.
 * POST /api/admin/seed
 *
 * After running once, delete this endpoint or add authentication.
 */
export async function POST() {
  try {
    const supabase = await createServiceRoleClient();

    // Seed users
    const usersToInsert = db.workerStatuses.map((ws) => ({
      id: ws.workerId,
      name: ws.workerName,
      role: 'worker', // Mock data is all workers; CEO/manager logic is UI-only for now
      avatar_url: null,
    }));

    const { error: usersError } = await supabase.from('users').insert(usersToInsert);
    if (usersError) throw new Error(`Users: ${usersError.message}`);

    // Seed jobs
    const jobsToInsert = db.jobs.map((job) => ({
      id: job.id,
      homeowner_name: job.homeownerName,
      address: job.address,
      scheduled_time: job.scheduledTime,
      status: job.status,
      created_at: job.createdAt,
    }));

    const { error: jobsError } = await supabase.from('jobs').insert(jobsToInsert);
    if (jobsError) throw new Error(`Jobs: ${jobsError.message}`);

    // Seed job-worker associations
    const jobWorkerPairs: Array<{ job_id: string; worker_id: string }> = [];
    db.jobs.forEach((job) => {
      job.assignedWorkerIds.forEach((workerId) => {
        jobWorkerPairs.push({
          job_id: job.id,
          worker_id: workerId,
        });
      });
    });

    if (jobWorkerPairs.length > 0) {
      const { error: jwError } = await supabase
        .from('jobs_workers')
        .insert(jobWorkerPairs);
      if (jwError) throw new Error(`Job-Workers: ${jwError.message}`);
    }

    // Seed worker statuses
    const workerStatusesToInsert = db.workerStatuses.map((ws) => ({
      worker_id: ws.workerId,
      worker_name: ws.workerName,
      punch_status: ws.punchStatus,
      job_state: ws.jobState,
      current_job_id: ws.currentJobId || null,
      location: ws.location || null,
    }));

    const { error: wsError } = await supabase
      .from('worker_statuses')
      .insert(workerStatusesToInsert);
    if (wsError) throw new Error(`Worker Statuses: ${wsError.message}`);

    // Seed tools
    const toolsToInsert = db.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      status: tool.status,
      checked_out_by_id: tool.checkedOutById || null,
      checked_out_by_name: tool.checkedOutByName || null,
      checked_out_at: tool.checkedOutAt || null,
    }));

    const { error: toolsError } = await supabase
      .from('tools')
      .insert(toolsToInsert);
    if (toolsError) throw new Error(`Tools: ${toolsError.message}`);

    // Seed timesheets
    const timesheetsToInsert = db.timesheets.map((ts) => ({
      id: ts.id,
      worker_id: ts.workerId,
      worker_name: ts.workerName,
      punch_in: ts.punchIn,
      punch_out: ts.punchOut || null,
      total_hours: ts.totalHours || null,
    }));

    const { error: tsError } = await supabase
      .from('timesheets')
      .insert(timesheetsToInsert);
    if (tsError) throw new Error(`Timesheets: ${tsError.message}`);

    // Seed event logs
    const eventsToInsert = db.events.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      worker_id: event.workerId,
      worker_name: event.workerName,
      message: event.message,
      job_id: event.jobId || null,
      severity: event.severity,
    }));

    const { error: eventsError } = await supabase
      .from('event_logs')
      .insert(eventsToInsert);
    if (eventsError) throw new Error(`Event Logs: ${eventsError.message}`);

    return NextResponse.json({
      success: true,
      message: 'Supabase seeded with initial data',
      stats: {
        users: usersToInsert.length,
        jobs: jobsToInsert.length,
        jobWorkerAssociations: jobWorkerPairs.length,
        workerStatuses: workerStatusesToInsert.length,
        tools: toolsToInsert.length,
        timesheets: timesheetsToInsert.length,
        events: eventsToInsert.length,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
