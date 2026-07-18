import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

// Reject (remove) a pending user. CEO only. Refuses to delete an approved user
// or the CEO themselves — this is just for clearing out pending sign-ups.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !me.approved || me.role !== 'ceo') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId: string = body.userId;
  if (!userId || userId === me.id) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('approved', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerUpdate('state-changed');
  return NextResponse.json({ success: true });
}
