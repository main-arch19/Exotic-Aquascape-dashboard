import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';
import { Job } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { homeownerName, address, scheduledTime, assignedWorkerIds, homeownerEmail } = body;

  if (!homeownerName || !address || !scheduledTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const jobId = Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();

  try {
    const supabase = await createServiceRoleClient();

    // Insert into jobs table
    const { error: jobError } = await supabase.from('jobs').insert({
      id: jobId,
      homeowner_name: homeownerName,
      address,
      scheduled_time: scheduledTime,
      homeowner_email: homeownerEmail || null,
      status: 'scheduled',
      created_at: now,
    });

    if (jobError) throw jobError;

    // Insert job-worker associations
    if (assignedWorkerIds?.length) {
      const jobWorkerPairs = assignedWorkerIds.map((workerId: string) => ({
        job_id: jobId,
        worker_id: workerId,
      }));

      const { error: jwError } = await supabase
        .from('jobs_workers')
        .insert(jobWorkerPairs);

      if (jwError) throw jwError;
    }

    // Log event
    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: now,
      type: 'job_created',
      worker_id: 'system',
      worker_name: 'System',
      message: `New job created for ${homeownerName} at ${address}`,
      job_id: jobId,
      severity: 'info',
    });

    const job: Job = {
      id: jobId,
      homeownerName,
      address,
      scheduledTime,
      assignedWorkerIds: assignedWorkerIds ?? [],
      status: 'scheduled',
      createdAt: now,
      homeownerEmail: homeownerEmail || undefined,
    };

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
