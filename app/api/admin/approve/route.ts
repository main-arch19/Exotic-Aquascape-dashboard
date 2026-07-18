import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

// Approve a pending user and assign a role. CEO only. Only 'manager' and
// 'worker' (agent) are assignable — the single CEO seat can't be handed out here.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !me.approved || me.role !== 'ceo') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId: string = body.userId;
  const role: string = body.role;

  if (!userId || (role !== 'manager' && role !== 'worker')) {
    return NextResponse.json(
      { error: 'userId and role (manager|worker) are required' },
      { status: 400 }
    );
  }
  if (userId === me.id) {
    return NextResponse.json({ error: 'The CEO cannot reassign themselves' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from('users')
    .update({ role, approved: true })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerUpdate('state-changed');
  return NextResponse.json({ success: true });
}
