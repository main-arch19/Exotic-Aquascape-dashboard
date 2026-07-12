import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { workerId, toolId } = await req.json();

  try {
    const supabase = await createServiceRoleClient();

    const workerRes = await supabase
      .from('worker_statuses')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    const toolRes = await supabase
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .single();

    if (!workerRes.data || !toolRes.data) {
      return NextResponse.json({ error: 'Worker or tool not found' }, { status: 404 });
    }

    if (toolRes.data.status === 'available') {
      return NextResponse.json({ error: 'Tool is already available' }, { status: 400 });
    }

    const prevHolder = toolRes.data.checked_out_by_name || workerRes.data.worker_name;

    await supabase
      .from('tools')
      .update({
        status: 'available',
        checked_out_by_id: null,
        checked_out_by_name: null,
        checked_out_at: null,
      })
      .eq('id', toolId);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type: 'tool_return',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${prevHolder} returned ${toolRes.data.name}`,
      severity: 'info',
    });

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, tool: toolRes.data });
  } catch (error) {
    console.error('Error returning tool:', error);
    return NextResponse.json({ error: 'Failed to return tool' }, { status: 500 });
  }
}
