import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { workerId } = await req.json();

  try {
    const supabase = await createServiceRoleClient();

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
      .update({ punch_status: 'clocked_out', job_state: 'idle' })
      .eq('worker_id', workerId);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
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
