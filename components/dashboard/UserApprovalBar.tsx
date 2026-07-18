'use client';

import { useState } from 'react';
import { UserCheck, Check, X, Loader2 } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { useDashboard } from '@/context/DashboardContext';

type AssignRole = 'worker' | 'manager';

export function UserApprovalBar() {
  const { users, refresh } = useDashboard();
  const pending = users.filter((u) => !u.approved);

  const [roleById, setRoleById] = useState<Record<string, AssignRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (path: string, userId: string, role?: AssignRole) => {
    setBusyId(userId);
    try {
      await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(role ? { userId, role } : { userId }),
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-6">
      <Section
        /* Section stores defaultOpen in useState, so it only reads it on mount —
           and on first render `users` is still loading, making pending empty.
           Keying on whether anyone is pending remounts the Section when that
           flips, so a CEO arriving to real pending users sees them expanded. */
        key={pending.length > 0 ? 'has-pending' : 'empty'}
        title={`Pending Approvals${pending.length ? ` (${pending.length})` : ''}`}
        icon={<UserCheck className="h-4 w-4" />}
        collapsible
        defaultOpen={pending.length > 0}
        accent="amber"
        hover
      >
        {pending.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">No one is waiting for approval.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((u) => {
              const role = roleById[u.id] ?? 'worker';
              const busy = busyId === u.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">Awaiting role assignment</p>
                  </div>
                  {/* min-h-10 keeps these comfortably tappable on a phone; the
                      denser desktop sizing returns at sm. */}
                  <div className="flex items-center gap-2">
                    <select
                      value={role}
                      onChange={(e) =>
                        setRoleById((s) => ({ ...s, [u.id]: e.target.value as AssignRole }))
                      }
                      disabled={busy}
                      className="min-h-10 flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:min-h-0 sm:flex-none"
                    >
                      <option value="worker">Agent</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => act('/api/admin/approve', u.id, role)}
                      disabled={busy}
                      className="flex min-h-10 items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60 sm:min-h-0"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => act('/api/admin/reject', u.id)}
                      disabled={busy}
                      aria-label={`Reject ${u.name}`}
                      className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-gray-200 px-2 py-1.5 text-gray-400 transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-60 sm:min-h-0 sm:min-w-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
