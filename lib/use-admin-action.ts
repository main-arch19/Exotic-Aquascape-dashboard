'use client';

import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';

/**
 * Shared plumbing for the CEO's admin endpoints: track which row is mid-flight,
 * POST, refresh dashboard state, surface a failure.
 *
 * Used by both UserApprovalBar (pending sign-ups) and TeamRolesBar (existing
 * members) so the fetch/refresh/busy dance lives in one place.
 */
export function useAdminAction() {
  const { refresh } = useDashboard();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (path: string, body: Record<string, unknown>) => {
    const userId = String(body.userId);
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Surface the server's reason rather than failing silently — these
        // actions change who can access the app.
        const detail = await res.json().catch(() => ({}));
        setError(detail.error ?? `Request failed (${res.status})`);
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError('Network error — please try again.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { run, busyId, error };
}
