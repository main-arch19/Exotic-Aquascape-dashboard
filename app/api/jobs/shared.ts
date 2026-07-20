import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import type { CurrentUser } from '@/lib/types';

/**
 * Auth helpers shared by the job routes.
 *
 * These routes touch the 001-era tables (jobs, jobs_workers, worker_statuses,
 * event_logs), which have RLS DISABLED. That means the route guard is the only
 * authorization there is — unlike the tracking tables, where RLS backs it up.
 * Do not remove a guard on the assumption that the database will catch it.
 */

export type Guarded =
  | { ok: true; me: CurrentUser }
  | { ok: false; response: NextResponse };

/** Any signed-in, approved user. */
export async function requireApproved(): Promise<Guarded> {
  const me = await getCurrentUser();
  if (!me) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!me.approved) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, me };
}

/** Manager or CEO only — dispatch privileges. */
export async function requireDispatcher(): Promise<Guarded> {
  const guard = await requireApproved();
  if (!guard.ok) return guard;
  if (guard.me.role !== 'manager' && guard.me.role !== 'ceo') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return guard;
}

/**
 * Resolves whose record an action applies to.
 *
 * An agent can only ever act as themselves — a `workerId` in the request body is
 * ignored for them, which is what closes the old hole where any caller could
 * pass any worker's id. A manager or CEO may act on a named agent, which
 * WorkerClockPanel needs and which lets a manager record an arrival when an
 * agent's phone has died.
 */
export function resolveTarget(me: CurrentUser, bodyWorkerId?: string | null): string {
  if (me.role === 'worker') return me.id;
  return bodyWorkerId || me.id;
}

export const newId = () => Math.random().toString(36).slice(2, 10);
