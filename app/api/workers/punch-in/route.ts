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

    if (workerRes.data.punch_status === 'clocked_in') {
      return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
    }

    const recordId = Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();

    await supabase.from('worker_statuses').update({ punch_status: 'clocked_in' }).eq('worker_id', workerId);

    const { data: record } = await supabase
      .from('timesheets')
      .insert({
        id: recordId,
        worker_id: workerId,
        worker_name: workerRes.data.worker_name,
        punch_in: now,
      })
      .select()
      .single();

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: now,
      type: 'punch_in',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${workerRes.data.worker_name} punched in`,
      severity: 'info',
    });

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error punching in:', error);
    return NextResponse.json({ error: 'Failed to punch in' }, { status: 500 });
  }
}
