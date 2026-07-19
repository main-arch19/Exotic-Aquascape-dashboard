'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2, MapPin, Navigation, Radio, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboard } from '@/context/DashboardContext';
import { useLocationTracker } from '@/lib/tracking/useLocationTracker';
import { CONSENT_VERSION, type TripDTO } from '@/lib/tracking/types';
import { ConsentDialog, hasStoredConsent, storeConsent } from './ConsentDialog';

/**
 * The worker's trip control.
 *
 * Self-sufficient: it reads its own active trip from /api/trips?scope=mine and
 * never needs the current user object, which is why DashboardContext does not
 * need to expose `me`.
 */
export function TripControlPanel() {
  const { jobs, refresh } = useDashboard();
  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState('');
  const [destination, setDestination] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const tracker = useLocationTracker();
  const { start: startTracking, stop: stopTracking } = tracker;

  const loadTrip = useCallback(async () => {
    try {
      const res = await fetch('/api/trips?scope=mine');
      if (!res.ok) return;
      const data = (await res.json()) as { trip: TripDTO | null };
      setTrip(data.trip);
      return data.trip;
    } catch {
      // Network hiccup — leave the last known state on screen.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  // Resume capture after a reload mid-trip. Without this a worker who reloads
  // sees "sharing is ON" from the server while nothing is actually capturing.
  useEffect(() => {
    if (trip && tracker.status === 'idle') {
      void startTracking(trip.id);
    }
    // Intentionally keyed on the trip id alone: re-running on every status
    // change would restart the watch on each transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  const doStart = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const res = await fetch('/api/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId || null,
          destination: destination.trim() || null,
          consentVersion: CONSENT_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Could not start the trip.');
        return;
      }
      setTrip(data.trip);
      setDestination('');
      setJobId('');
      await startTracking(data.trip.id);
      await refresh();
    } catch {
      setApiError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = () => {
    if (!hasStoredConsent()) {
      setConsentOpen(true);
      return;
    }
    void doStart();
  };

  const handleEnd = async () => {
    if (!trip) return;
    if (!window.confirm('End this trip? Location sharing will stop.')) return;
    setBusy(true);
    setApiError(null);
    try {
      const res = await fetch('/api/trips/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id, reason: 'worker' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Could not end the trip.');
        return;
      }
      await stopTracking();
      setTrip(null);
      await refresh();
    } catch {
      setApiError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  // Jobs this worker could plausibly be driving to.
  const selectableJobs = jobs.filter(
    (j) => j.status === 'scheduled' || j.status === 'in_progress'
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (trip) {
    const lastFix = tracker.lastPing
      ? formatDistanceToNow(new Date(tracker.lastPing.capturedAt), { addSuffix: true })
      : null;

    return (
      <Card className="border-accent">
        <CardContent className="space-y-4 py-4">
          {/* The banner is unmissable on purpose and sits above everything else
              in AgentView. Burying a "your location is being shared" indicator
              below the fold is how a consent question becomes a dispute. */}
          <div className="flex items-start gap-3 rounded-lg bg-accent/10 px-3 py-2.5">
            <motion.span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Location sharing is ON
              </p>
              {/* Do not soften this sentence. It is the difference between a
                  documented limitation and a support ticket. */}
              <p className="text-xs text-muted-foreground">
                Tracking pauses when your screen is off or you switch apps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-foreground">
              {trip.destination ?? 'Trip in progress'}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Last fix</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {lastFix ?? 'Waiting…'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Accuracy</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {tracker.lastPing?.accuracyM != null
                  ? `±${Math.round(tracker.lastPing.accuracyM)} m`
                  : '—'}
              </dd>
            </div>
          </dl>

          {tracker.queuedCount > 0 && (
            <p className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              {tracker.queuedCount} {tracker.queuedCount === 1 ? 'ping' : 'pings'} waiting
              to upload
            </p>
          )}

          {tracker.error && (
            <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p>{tracker.error.message}</p>
                {tracker.status === 'denied' && (
                  <p className="mt-1 opacity-80">
                    The app cannot ask again — re-enable location for this site in your
                    browser settings, then end and restart the trip.
                  </p>
                )}
              </div>
            </div>
          )}

          {apiError && <p className="text-xs text-destructive">{apiError}</p>}

          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleEnd}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'End trip'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Start a trip</p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="trip-job"
              className="text-xs font-medium text-muted-foreground"
            >
              Job (optional)
            </label>
            {/* A native select rather than the Base UI one: the existing
                dashboard uses native selects, and on a phone the OS picker is
                the better control for a field worker. */}
            <select
              id="trip-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Ad-hoc trip (no job)</option>
              {selectableJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.homeownerName} — {j.address}
                </option>
              ))}
            </select>
          </div>

          {!jobId && (
            <div className="space-y-1">
              <label
                htmlFor="trip-destination"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
              >
                <MapPin className="h-3 w-3" /> Where are you headed?
              </label>
              <input
                id="trip-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Supply run, warehouse…"
                className="min-h-10 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          )}

          {apiError && <p className="text-xs text-destructive">{apiError}</p>}

          <Button
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start trip'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Nothing is tracked until you start a trip.
          </p>
        </CardContent>
      </Card>

      <ConsentDialog
        open={consentOpen}
        onAgree={() => {
          storeConsent();
          setConsentOpen(false);
          void doStart();
        }}
        onCancel={() => setConsentOpen(false)}
      />
    </>
  );
}
