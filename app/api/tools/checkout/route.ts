import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    if (toolRes.data.status === 'checked_out') {
      return NextResponse.json({ error: 'Tool already checked out' }, { status: 400 });
    }

    await supabase
      .from('tools')
      .update({
        status: 'checked_out',
        checked_out_by_id: workerId,
        checked_out_by_name: workerRes.data.worker_name,
        checked_out_at: new Date().toISOString(),
      })
      .eq('id', toolId);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type: 'tool_checkout',
      worker_id: workerId,
      worker_name: workerRes.data.worker_name,
      message: `${workerRes.data.worker_name} checked out ${toolRes.data.name}`,
      severity: 'info',
    });

    return NextResponse.json({ success: true, tool: toolRes.data });
  } catch (error) {
    console.error('Error checking out tool:', error);
    return NextResponse.json({ error: 'Failed to checkout tool' }, { status: 500 });
  }
}
