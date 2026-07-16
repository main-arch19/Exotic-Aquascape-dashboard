import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/types';

/**
 * Resolves the current authenticated user (verified via Supabase Auth cookies)
 * into a CurrentUser, ensuring a matching `users` row exists — keyed by the auth
 * uid — so chat messages have a stable sender profile. Returns null when the
 * request is unauthenticated.
 *
 * Auth is checked with the cookie-bound anon client (getUser revalidates the
 * token); the profile row is read/written with the service-role client to match
 * how the rest of the app accesses the database.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceRoleClient();

  const { data: existing } = await service
    .from('users')
    .select('id, name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      role: existing.role,
      avatarUrl: existing.avatar_url ?? undefined,
    };
  }

  // First authenticated request for this account: create a profile row.
  const name =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    'User';
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? undefined;

  await service.from('users').upsert(
    {
      id: user.id,
      name,
      role: 'worker',
      avatar_url: avatarUrl ?? null,
    },
    { onConflict: 'id' }
  );

  return { id: user.id, name, role: 'worker', avatarUrl };
}
