'use client';

import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { AlertTriangle, Navigation, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTrackingSession } from './TrackingSessionProvider';

/**
 * Live status of the agent's location sharing.
 *
 * Display only. There is no stop control: sharing is a condition of accepting a
 * dispatched job and runs until the job is marked complete. Accept and Complete
 * both live on the job card, because they are per-job actions while this panel
 * is per-worker.
 */
export function TrackingStatusPanel() {
  const { trip, tracker } = useTrackingSession();

  if (!trip) return null;

  const lastFix = tracker.lastPing
    ? formatDistanceToNow(new Date(tracker.lastPing.capturedAt), { addSuffix: true })
    : null;

  return (
    <Card className="border-accent">
      <CardContent className="space-y-4 py-4">
        {/* Unmissable and first on the screen. Burying a "your location is being
            shared" indicator below the fold is how a disclosure becomes a
            dispute. */}
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
            {/* Do not soften this. It is the difference between a documented
                limitation and a support ticket. */}
            <p className="text-xs text-muted-foreground">
              Sharing is on until you mark this job complete. It pauses when your
              screen is off or you switch apps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-foreground">
            {trip.destination ?? 'Job in progress'}
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
            {tracker.queuedCount} {tracker.queuedCount === 1 ? 'point' : 'points'}{' '}
            waiting to upload
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
                  browser settings, then reload. Your manager can see that sharing
                  isn’t reporting.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
