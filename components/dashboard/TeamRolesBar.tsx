'use client';

import { useState } from 'react';
import { Users, Loader2, ShieldCheck, RotateCcw } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { useDashboard } from '@/context/DashboardContext';
import { useAdminAction } from '@/lib/use-admin-action';
import type { User } from '@/lib/types';

type AssignRole = 'worker' | 'manager';

const ROLE_LABEL: Record<string, string> = {
  ceo: 'CEO',
  manager: 'Manager',
  worker: 'Agent',
};

export function TeamRolesBar({ currentUserId }: { currentUserId?: string }) {
  const { users } = useDashboard();
  const { run, busyId, error } = useAdminAction();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const team = users.filter((u) => u.approved && !u.revoked);
  const revoked = users.filter((u) => u.revoked);

  const changeRole = (u: User, role: AssignRole) =>
    run('/api/admin/approve', { userId: u.id, role });

  const revoke = async (u: User) => {
    const ok = await run('/api/admin/revoke', { userId: u.id });
    if (ok) setConfirmingId(null);
  };

  return (
    <div className="mb-6">
      <Section
        /* Section reads defaultOpen once at mount, when `users` is still
           loading. Keying on whether there's anything to show remounts it when
           real data lands. Same fix as UserApprovalBar. */
        key={team.length > 0 ? 'has-team' : 'empty'}
        title={`Team Roles${team.length ? ` (${team.length})` : ''}`}
        icon={<Users className="h-4 w-4" />}
        collapsible
        defaultOpen={team.length > 0}
        accent="primary"
        hover
      >
        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {team.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">No approved team members yet.</p>
        ) : (
          <div className="space-y-2">
            {team.map((u) => {
              const busy = busyId === u.id;
              const isCeo = u.role === 'ceo';
              const isSelf = u.id === currentUserId;
              const confirming = confirmingId === u.id;

              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{ROLE_LABEL[u.role] ?? u.role}</p>
                  </div>

                  {isCeo ? (
                    /* The CEO seat is fixed: it can't be reassigned or revoked,
                       so there are no controls to render here at all. */
                    <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      CEO — fixed
                    </span>
                  ) : confirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Remove {u.name}?</span>
                      <button
                        type="button"
                        onClick={() => revoke(u)}
                        disabled={busy}
                        className="flex min-h-10 items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60 sm:min-h-0"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={busy}
                        className="min-h-10 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-60 sm:min-h-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as AssignRole)}
                        disabled={busy}
                        aria-label={`Role for ${u.name}`}
                        className="min-h-10 flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-60 sm:min-h-0 sm:flex-none"
                      >
                        <option value="worker">Agent</option>
                        <option value="manager">Manager</option>
                      </select>
                      {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />}
                      <button
                        type="button"
                        onClick={() => setConfirmingId(u.id)}
                        disabled={busy}
                        className="min-h-10 shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-60 sm:min-h-0"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {revoked.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Removed ({revoked.length})
            </p>
            <div className="space-y-2">
              {revoked.map((u) => {
                const busy = busyId === u.id;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-500">{u.name}</p>
                      <p className="text-xs text-gray-400">Access removed — history kept</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => run('/api/admin/approve', { userId: u.id, role: 'worker' })}
                      disabled={busy}
                      className="flex min-h-10 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-60 sm:min-h-0"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Restore as Agent
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
