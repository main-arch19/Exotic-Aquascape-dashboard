import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { workerId, punchIn, punchOut } = await req.json();

  if (!workerId || !punchIn) {
    return NextResponse.json({ error: 'workerId and punchIn are required' }, { status: 400 });
  }

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

    let totalHours: number | null = null;
    if (punchOut) {
      const diffMs = new Date(punchOut).getTime() - new Date(punchIn).getTime();
      if (diffMs <= 0) {
        return NextResponse.json({ error: 'Punch out must be after punch in' }, { status: 400 });
      }
      totalHours = Math.round((diffMs / 3_600_000) * 100) / 100;
    }

    const recordId = Math.random().toString(36).slice(2, 10);

    const { data: record, error } = await supabase
      .from('timesheets')
      .insert({
        id: recordId,
        worker_id: workerId,
        worker_name: workerRes.data.worker_name,
        punch_in: punchIn,
        punch_out: punchOut || null,
        total_hours: totalHours,
      })
      .select()
      .single();

    if (error) throw error;

    await triggerUpdate('state-changed');

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        workerId: record.worker_id,
        workerName: record.worker_name,
        punchIn: record.punch_in,
        punchOut: record.punch_out ?? undefined,
        totalHours: record.total_hours ?? undefined,
      },
    });
  } catch (error) {
    console.error('Error creating timesheet entry:', error);
    return NextResponse.json({ error: 'Failed to create timesheet entry' }, { status: 500 });
  }
}
