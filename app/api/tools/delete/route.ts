import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { toolId } = await req.json();
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 });

  try {
    const supabase = await createServiceRoleClient();

    const { error } = await supabase.from('tools').delete().eq('id', toolId);

    if (error) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
