import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';
import { sendPushNotification } from '@/lib/onesignal';
import { Job } from '@/lib/types';
import { newId, requireDispatcher } from '../shared';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    homeownerName,
    address,
    scheduledTime,
    assignedWorkerIds,
    managerId,
    homeownerEmail,
  } = body;

  if (!homeownerName || !address || !scheduledTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const jobId = newId();
  const now = new Date().toISOString();

  try {
    // Creating a job assigns work, which is the same privilege as assigning it
    // afterwards. Gating one route and not the other would be theatre.
    const guard = await requireDispatcher();
    if (!guard.ok) return guard.response;
    const { me } = guard;

    const supabase = await createServiceRoleClient();

    // Only approved field agents may be assigned. A manager in jobs_workers
    // would get an assignment push, an Accept button, and GPS tracking on
    // themselves — the owning manager goes in jobs.manager_id instead.
    const workerIds: string[] = Array.isArray(assignedWorkerIds)
      ? assignedWorkerIds.filter(Boolean)
      : [];

    let agents: { id: string; name: string }[] = [];
    if (workerIds.length > 0) {
      const { data: candidates } = await supabase
        .from('users')
        .select('id, name, role, approved, revoked')
        .in('id', workerIds);

      const valid = (candidates ?? []).filter(
        (u) => u.role === 'worker' && u.approved && !u.revoked
      );
      if (valid.length !== workerIds.length) {
        return NextResponse.json(
          { error: 'Only approved field agents can be assigned to a job' },
          { status: 400 }
        );
      }
      agents = valid.map((u) => ({ id: u.id, name: u.name }));
    }

    const { error: jobError } = await supabase.from('jobs').insert({
      id: jobId,
      homeowner_name: homeownerName,
      address,
      scheduled_time: scheduledTime,
      homeowner_email: homeownerEmail || null,
      manager_id: managerId || null,
      status: 'scheduled',
      created_at: now,
    });

    if (jobError) throw jobError;

    if (agents.length > 0) {
      const { error: jwError } = await supabase.from('jobs_workers').insert(
        agents.map((a) => ({
          job_id: jobId,
          worker_id: a.id,
          assigned_at: now,
          assigned_by: me.id,
        }))
      );

      if (jwError) {
        // These two inserts are not atomic and supabase-js has no transaction.
        // Compensate rather than leaving a job nobody is assigned to and nobody
        // can see. The correct fix is a create_job_with_assignments RPC.
        console.error('Assignment insert failed, rolling back job:', jwError);
        await supabase.from('jobs').delete().eq('id', jobId);
        return NextResponse.json(
          { error: 'Failed to assign agents to the new job' },
          { status: 500 }
        );
      }
    }

    // The actor is the creating manager. This previously wrote worker_id
    // 'system', which has no users row and therefore violated the FK — and the
    // error was never checked, so it failed silently on every job ever created.
    const { error: logError } = await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: now,
      type: 'job_created',
      worker_id: me.id,
      worker_name: me.name,
      message: `${me.name} created a job for ${homeownerName} at ${address}`,
      job_id: jobId,
      severity: 'info',
    });
    if (logError) console.error('Error writing job_created log:', logError);

    if (agents.length > 0) {
      await supabase.from('event_logs').insert(
        agents.map((a) => ({
          id: newId(),
          timestamp: now,
          type: 'job_assigned',
          worker_id: a.id,
          worker_name: a.name,
          message: `${me.name} assigned ${a.name} to ${homeownerName} at ${address}`,
          job_id: jobId,
          severity: 'info',
        }))
      );

      await sendPushNotification({
        message: `New job: ${homeownerName}, ${address}. Open the app to accept.`,
        heading: 'You have been assigned a job',
        externalUserIds: agents.map((a) => a.id),
        data: { jobId },
      });
    }

    const job: Job = {
      id: jobId,
      homeownerName,
      address,
      scheduledTime,
      assignedWorkerIds: agents.map((a) => a.id),
      assignments: agents.map((a) => ({
        workerId: a.id,
        assignedAt: now,
        acceptedAt: null,
        assignedBy: me.id,
      })),
      managerId: managerId || undefined,
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
