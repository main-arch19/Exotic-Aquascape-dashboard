import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  const { toolId, name, category } = await req.json();
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 });

  try {
    const supabase = await createServiceRoleClient();

    const updateData: Record<string, any> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (category?.trim()) updateData.category = category.trim();

    const { data, error } = await supabase
      .from('tools')
      .update(updateData)
      .eq('id', toolId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    await triggerUpdate('state-changed');

    return NextResponse.json({ success: true, tool: data });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}
