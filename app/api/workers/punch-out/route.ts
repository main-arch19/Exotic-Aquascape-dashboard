import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { triggerTracking, triggerUpdate } from '@/lib/pusher-server';
import { newId, requireApproved, resolveTarget } from '@/app/api/jobs/shared';

export async function POST(req: NextRequest) {
  const { workerId: bodyWorkerId } = await req.json();

  try {
    const guard = await requireApproved();
    if (!guard.ok) return guard.response;
    const { me } = guard;
    const workerId = resolveTarget(me, bodyWorkerId);

    const supabase = await createServiceRoleClient();
    const session = await createClient();

    const workerRes = await supabase
      .from('worker_statuses')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (!workerRes.data) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    if (workerRes.data.punch_status === 'clocked_out') {
      return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const openRecordRes = await supabase
      .from('timesheets')
      .select('*')
      .eq('worker_id', workerId)
      .is('punch_out', null)
      .order('punch_in', { ascending: false })
      .limit(1);

    const record = openRecordRes.data?.[0];
    let totalHours = 0;

    if (record) {
      const diffMs = new Date(now).getTime() - new Date(record.punch_in).getTime();
      totalHours = Math.round((diffMs / 3_600_000) * 100) / 100;

      await supabase
        .from('timesheets')
        .update({ punch_out: now, total_hours: totalHours })
        .eq('id', record.id);
    }

    await supabase
      .from('worker_statuses')
      .update({ punch_status: 'clocked_out', job_state: 'idle', current_job_id: null })
      .eq('worker_id', workerId);

    // Clocking out ends location sharing. This is the mechanism that makes the
    // notice's "nothing is collected while you're clocked out" literally true
    // rather than a promise. Non-fatal: a tracking failure must not block the
    // punch-out, which is a payroll action.
    //
    // The agent can resume from the job list afterwards — jobs/accept is
    // idempotent and re-opens a trip when the assignment is already accepted.
    try {
      const { data: endedTrip, error: tripError } = await session
        .from('field_trips')
        .update({ status: 'ended', ended_at: now, end_reason: 'worker' })
        .eq('worker_id', workerId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();

      if (tripError) {
        console.error('Failed to end trip on punch-out:', tripError);
      } else if (endedTrip) {
        await supabase.from('event_logs').insert({
          id: newId(),
          timestamp: now,
          type: 'trip_ended',
          worker_id: workerId,
          worker_name: workerRes.data.worker_name,
          message: `${workerRes.data.worker_name} stopped sharing location — clocked out`,
          severity: 'info',
        });
        after(() =>
          triggerTracking('trip-ended', {
            tripId: endedTrip.id,
            workerId,
            endedAt: now,
            endReason: 'worker',
          })
        );
      }
    } catch (tripError) {
      console.error('Failed to end trip on punch-out:', tripError);
    }

    await supabase.from('event_logs').insert({
      id: newId(),
      timestamp: now,
      type: 'punch_out',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${workerRes.data.worker_name} punched out${totalHours > 0 ? ` — ${totalHours}h logged` : ''}`,
      severity: 'info',
    });

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, record: { ...record, punch_out: now, total_hours: totalHours } });
  } catch (error) {
    console.error('Error punching out:', error);
    return NextResponse.json({ error: 'Failed to punch out' }, { status: 500 });
  }
}
