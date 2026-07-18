import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/lib/types';

/**
 * Resolves the current authenticated user (verified via Supabase Auth cookies)
 * into a CurrentUser, ensuring a matching `users` row exists — keyed by the auth
 * uid. The CEO seat is claimed by the first sign-in: if no CEO exists yet the new
 * user becomes the single approved CEO; everyone after lands as pending
 * (approved=false) until the CEO approves and assigns them a role.
 *
 * Returns null when the request is unauthenticated.
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
    .select('id, name, role, avatar_url, approved')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      role: existing.role,
      avatarUrl: existing.avatar_url ?? undefined,
      approved: existing.approved ?? false,
    };
  }

  // First authenticated request for this account: create a profile row.
  const name =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    'User';
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? undefined;
  const base = { id: user.id, name, avatar_url: avatarUrl ?? null };

  // Claim the open CEO seat if it's still empty.
  const { data: ceo } = await service
    .from('users')
    .select('id')
    .eq('role', 'ceo')
    .limit(1)
    .maybeSingle();

  if (!ceo) {
    const { error } = await service
      .from('users')
      .insert({ ...base, role: 'ceo', approved: true });
    if (!error) {
      return { id: user.id, name, role: 'ceo', avatarUrl, approved: true };
    }
    // Lost the race for the single-CEO seat — fall through to pending.
  }

  await service
    .from('users')
    .upsert({ ...base, role: 'worker', approved: false }, { onConflict: 'id' });

  return { id: user.id, name, role: 'worker', avatarUrl, approved: false };
}
