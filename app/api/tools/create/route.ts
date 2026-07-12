import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { name, category } = await req.json();
  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
  }

  try {
    const supabase = await createServiceRoleClient();
    const toolId = Math.random().toString(36).slice(2, 10);

    const { data, error } = await supabase
      .from('tools')
      .insert({
        id: toolId,
        name: name.trim(),
        category: category.trim(),
        status: 'available',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, tool: data });
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}
