'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Ping, TripDTO } from '@/lib/tracking/types';
import type { MapTrack } from './TrackingMap';

const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full rounded-xl" />,
});

const SPEEDS = [30, 60, 120, 300];
const TICK_MS = 100;

export function RouteReplay({ onBack }: { onBack: () => void }) {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [tripId, setTripId] = useState('');
  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [downsampled, setDownsampled] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Completed trips aren't in scope=active, so fetch history candidates from
  // the same endpoint the monitor uses and let RLS decide what's visible.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/trips?scope=recent');
        if (!res.ok) return;
        const data = (await res.json()) as { trips: TripDTO[] };
        setTrips(data.trips);
      } catch {
        // Leave the picker empty.
      }
    })();
  }, []);

  const loadTrip = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setPlaying(false);
    try {
      const res = await fetch(`/api/trips?scope=history&tripId=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        trip: TripDTO;
        pings: Ping[];
        downsampled: boolean;
      };
      setTrip(data.trip);
      setPings(data.pings);
      setDownsampled(data.downsampled);
      setIdx(data.pings.length > 0 ? 1 : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Playback advances along the recorded TIMELINE rather than one point per
  // tick: pings are unevenly spaced (8s while driving, 60s while parked), so a
  // fixed step would race through a stop and crawl through a highway stretch.
  // At 60x, one second of wall clock covers a minute of the real trip.
  useEffect(() => {
    if (!playing || pings.length === 0) return;

    const startWall = Date.now();
    const startTripMs = new Date(pings[Math.max(0, idx - 1)].capturedAt).getTime();

    timerRef.current = setInterval(() => {
      const virtualElapsed = (Date.now() - startWall) * speed;
      const cutoff = startTripMs + virtualElapsed;
      let next = idx;
      while (next < pings.length && new Date(pings[next].capturedAt).getTime() <= cutoff) {
        next++;
      }
      if (next >= pings.length) {
        setIdx(pings.length);
        setPlaying(false);
        return;
      }
      setIdx(next);
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // idx is read to resume from the scrubber position but must not retrigger
    // the effect, or every advance would restart the clock and playback stalls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, pings, speed]);

  const current = pings[Math.max(0, idx - 1)];
  const tracks: MapTrack[] = trip
    ? [
        {
          id: trip.id,
          label: trip.workerName,
          sublabel: trip.destination ?? undefined,
          pings: pings.slice(0, idx),
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to live
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tripId}
              onChange={(e) => {
                setTripId(e.target.value);
                void loadTrip(e.target.value);
              }}
              className="min-h-10 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 sm:min-h-0 sm:flex-none"
            >
              <option value="">Choose a trip…</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.workerName} — {t.destination ?? 'Ad-hoc'} —{' '}
                  {format(new Date(t.startedAt), 'MMM d, h:mm a')}
                </option>
              ))}
            </select>

            {pings.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (idx >= pings.length) setIdx(0);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="min-h-10 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground sm:min-h-0"
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading route…
            </p>
          )}

          {pings.length > 0 && (
            <>
              <input
                type="range"
                min={0}
                max={pings.length}
                value={idx}
                onChange={(e) => {
                  setPlaying(false);
                  setIdx(Number(e.target.value));
                }}
                className="w-full accent-primary"
                aria-label="Scrub through the route"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {current
                    ? format(new Date(current.capturedAt), 'MMM d, h:mm:ss a')
                    : '—'}
                </span>
                <span>
                  {idx} / {pings.length} points
                  {downsampled && ' (downsampled)'}
                </span>
              </div>
            </>
          )}

          {!loading && tripId && pings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No location points were recorded for this trip.
            </p>
          )}
        </CardContent>
      </Card>

      <TrackingMap tracks={tracks} showMarkers />
    </div>
  );
}
