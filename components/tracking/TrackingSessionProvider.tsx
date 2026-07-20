'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useLocationTracker, type LocationTracker } from '@/lib/tracking/useLocationTracker';
import { CONSENT_VERSION, type TripDTO } from '@/lib/tracking/types';
import { ConsentDialog, hasSeenNotice, markNoticeSeen } from './ConsentDialog';

interface TrackingSessionValue {
  trip: TripDTO | null;
  tracker: LocationTracker;
  /** Accept an assigned job. Shows the notice first if it hasn't been seen. */
  acceptJob: (jobId: string, jobLabel?: string) => void;
  /** Mark a job complete. Ends the trip server-side and stops capture. */
  completeJob: (jobId: string) => Promise<{ ok: boolean; error?: string }>;
  busyJobId: string | null;
  error: string | null;
}

const Ctx = createContext<TrackingSessionValue | null>(null);

/**
 * Owns the single location-tracker instance for the agent's session.
 *
 * The hook has to live above both the job list (where Accept and Complete are)
 * and the status banner (where tracking state is displayed), because
 * `tracker.stop()` on completion must run against the very same instance that
 * `tracker.start()` was called on. Two separate `useLocationTracker()` calls
 * would leave a watch running with nothing to stop it.
 */
export function TrackingSessionProvider({ children }: { children: React.ReactNode }) {
  const { refresh } = useDashboard();
  const tracker = useLocationTracker();
  const { start: startTracking, stop: stopTracking } = tracker;

  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState<{ id: string; label?: string } | null>(
    null
  );

  const loadTrip = useCallback(async () => {
    try {
      const res = await fetch('/api/trips?scope=mine');
      if (!res.ok) return null;
      const data = (await res.json()) as { trip: TripDTO | null };
      setTrip(data.trip);
      return data.trip;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  // Resume capture after a page reload mid-job. Without this the server still
  // shows an active trip while nothing is actually capturing, and the banner
  // would be lying.
  useEffect(() => {
    if (trip && tracker.status === 'idle') {
      void startTracking(trip.id);
    }
    // Keyed on the trip id alone: re-running on every status change would
    // restart the watch on each transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  const doAccept = useCallback(
    async (jobId: string) => {
      setBusyJobId(jobId);
      setError(null);
      try {
        const res = await fetch('/api/jobs/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, noticeVersion: CONSENT_VERSION }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Could not accept the job.');
          return;
        }
        setTrip(data.trip);
        // Start capture AFTER the trip exists. This fires the OS permission
        // prompt; if the agent denies it the acceptance still stands and the
        // panel surfaces the denial — a browser setting must not block someone
        // from taking assigned work.
        await startTracking(data.trip.id);
        await refresh();
      } catch {
        setError('Network error. Check your connection and try again.');
      } finally {
        setBusyJobId(null);
      }
    },
    [refresh, startTracking]
  );

  const acceptJob = useCallback(
    (jobId: string, jobLabel?: string) => {
      if (!hasSeenNotice()) {
        setPendingJob({ id: jobId, label: jobLabel });
        return;
      }
      void doAccept(jobId);
    },
    [doAccept]
  );

  const completeJob = useCallback(
    async (jobId: string) => {
      setBusyJobId(jobId);
      setError(null);
      try {
        const res = await fetch('/api/jobs/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Could not complete the job.');
          return { ok: false, error: data.error };
        }
        await stopTracking();
        setTrip(null);
        await refresh();
        return { ok: true };
      } catch {
        setError('Network error. Check your connection and try again.');
        return { ok: false, error: 'Network error' };
      } finally {
        setBusyJobId(null);
      }
    },
    [refresh, stopTracking]
  );

  return (
    <Ctx.Provider
      value={{ trip, tracker, acceptJob, completeJob, busyJobId, error }}
    >
      {children}
      <ConsentDialog
        open={pendingJob !== null}
        jobLabel={pendingJob?.label}
        onAccept={() => {
          markNoticeSeen();
          const job = pendingJob;
          setPendingJob(null);
          if (job) void doAccept(job.id);
        }}
        onCancel={() => setPendingJob(null)}
      />
    </Ctx.Provider>
  );
}

export function useTrackingSession() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useTrackingSession must be used within <TrackingSessionProvider>');
  }
  return ctx;
}
