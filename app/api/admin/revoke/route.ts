import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';

// Remove an approved team member. CEO only.
//
// This is a soft revoke, not a delete. timesheets.worker_id and
// event_logs.worker_id declare ON DELETE CASCADE, so deleting the user row
// would destroy every hour they ever logged. Setting approved = false cuts
// access immediately (the same flag already gates the whole app) while
// revoked = true tells the UI this is a departed member rather than a new
// sign-up waiting in the approval queue.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !me.approved || me.role !== 'ceo') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId: string = body.userId;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  // Revoking yourself would leave the single CEO seat filled by an account that
  // can no longer sign in, with no one able to reassign it.
  if (userId === me.id) {
    return NextResponse.json({ error: 'The CEO cannot revoke themselves' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  // Scoped to non-CEO rows as defence in depth: even if a second CEO row ever
  // existed, this endpoint could not be used to lock the company out.
  const { error } = await supabase
    .from('users')
    .update({ approved: false, revoked: true })
    .eq('id', userId)
    .neq('role', 'ceo');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerUpdate('state-changed');
  return NextResponse.json({ success: true });
}
