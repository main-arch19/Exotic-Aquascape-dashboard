'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, BatteryLow, History, Radio, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPusherClient } from '@/lib/pusher-client';
import { TRACKING_MONITOR_CHANNEL } from '@/lib/tracking/channel';
import type {
  Ping,
  PingBatchEvent,
  TripDTO,
  TripEndedEvent,
} from '@/lib/tracking/types';
import { RouteReplay } from './RouteReplay';
import type { MapTrack } from './TrackingMap';

// Leaflet touches `window`, so it cannot render on the server. The dynamic()
// call must live in a client component — the Next 16 docs are explicit that
// ssr:false is unsupported in Server Components. This also keeps the map bundle
// out of every other tab.
const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full rounded-xl" />,
});

const POLL_FALLBACK_MS = 30_000;
const RENDER_THROTTLE_MS = 1_000;

type LiveState = 'connecting' | 'live' | 'unavailable' | 'polling';

export function TrackingMonitor() {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveState, setLiveState] = useState<LiveState>('connecting');
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [, forceRender] = useState(0);

  // Ping series live in a ref so a 50-ping batch doesn't cause 50 renders; a
  // throttled tick promotes them to the screen at ~1 Hz.
  const pingsRef = useRef<Map<string, Ping[]>>(new Map());
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRender = useCallback(() => {
    if (renderTimerRef.current !== null) return;
    renderTimerRef.current = setTimeout(() => {
      renderTimerRef.current = null;
      forceRender((n) => n + 1);
    }, RENDER_THROTTLE_MS);
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const res = await fetch('/api/trips?scope=active');
      if (!res.ok) return;
      const data = (await res.json()) as { trips: TripDTO[] };
      setTrips(data.trips);
      // Seed each series with the latest fix so markers appear before the first
      // Pusher frame arrives.
      for (const t of data.trips) {
        if (t.lastPing && !pingsRef.current.has(t.id)) {
          pingsRef.current.set(t.id, [t.lastPing]);
        }
      }
      scheduleRender();
    } catch {
      // Leave the last known state on screen.
    } finally {
      setLoading(false);
    }
  }, [scheduleRender]);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  useEffect(() => {
    const pusher = getPusherClient();

    // Pusher unconfigured must not crash the page — degrade to polling, which
    // matches how DashboardContext handles the same null return.
    if (!pusher) {
      setLiveState('polling');
      const id = setInterval(() => void loadActive(), POLL_FALLBACK_MS);
      return () => clearInterval(id);
    }

    const channel = pusher.subscribe(TRACKING_MONITOR_CHANNEL);

    const onSubscribed = () => setLiveState('live');
    const onSubscriptionError = () => setLiveState('unavailable');

    const onTripStarted = (payload: { trip: TripDTO }) => {
      setTrips((cur) =>
        cur.some((t) => t.id === payload.trip.id) ? cur : [payload.trip, ...cur]
      );
    };

    const onPingBatch = (payload: PingBatchEvent) => {
      const existing = pingsRef.current.get(payload.tripId) ?? [];
      pingsRef.current.set(payload.tripId, [...existing, ...payload.pings]);
      scheduleRender();
    };

    const onTripEnded = (payload: TripEndedEvent) => {
      setTrips((cur) => cur.filter((t) => t.id !== payload.tripId));
      pingsRef.current.delete(payload.tripId);
      setSelected((s) => (s === payload.tripId ? null : s));
      scheduleRender();
    };

    channel.bind('pusher:subscription_succeeded', onSubscribed);
    channel.bind('pusher:subscription_error', onSubscriptionError);
    channel.bind('trip-started', onTripStarted);
    channel.bind('ping-batch', onPingBatch);
    channel.bind('trip-ended', onTripEnded);

    return () => {
      channel.unbind('pusher:subscription_succeeded', onSubscribed);
      channel.unbind('pusher:subscription_error', onSubscriptionError);
      channel.unbind('trip-started', onTripStarted);
      channel.unbind('ping-batch', onPingBatch);
      channel.unbind('trip-ended', onTripEnded);
      pusher.unsubscribe(TRACKING_MONITOR_CHANNEL);
    };
  }, [loadActive, scheduleRender]);

  const forceEnd = async (tripId: string) => {
    if (!window.confirm('Force this trip to end?')) return;
    await fetch('/api/trips/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, reason: 'manager' }),
    });
    await loadActive();
  };

  const tracks: MapTrack[] = trips.map((t) => ({
    id: t.id,
    label: t.workerName,
    sublabel: t.destination ?? undefined,
    pings: pingsRef.current.get(t.id) ?? [],
  }));

  if (showReplay) {
    return <RouteReplay onBack={() => setShowReplay(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LiveBadge state={liveState} />
          <span className="text-sm text-muted-foreground">
            {trips.length} active {trips.length === 1 ? 'trip' : 'trips'}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowReplay(true)}>
          <History className="h-3.5 w-3.5" />
          Route history
        </Button>
      </div>

      {/* after() moves the Pusher publish off the ingest response path, which
          means an outage shows up as a frozen map rather than slow writes. This
          banner is what stops a manager reading "frozen" as "nobody moved". */}
      {liveState === 'unavailable' && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Live updates unavailable. Positions shown may be out of date.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="order-2 lg:order-1">
          <CardContent className="space-y-2 py-3">
            {loading ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : trips.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No one is on a trip right now.
              </p>
            ) : (
              trips.map((t) => {
                const series = pingsRef.current.get(t.id) ?? [];
                const last = series[series.length - 1];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelected(t.id);
                      if (last) setFocus([last.lat, last.lng]);
                    }}
                    className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                      selected === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {t.workerName}
                      </span>
                      {/* On site is reported separately from stale. An agent who
                          has arrived is EXPECTED to go quiet — a browser cannot
                          track a pocketed phone — and flagging that as a problem
                          would train managers to ignore the stale warning on the
                          drives where it actually means something. */}
                      {t.onSite ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          On site
                        </span>
                      ) : (
                        t.isStale && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            Stale
                          </span>
                        )
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.destination ?? 'Ad-hoc trip'}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {last
                          ? formatDistanceToNow(new Date(last.capturedAt), {
                              addSuffix: true,
                            })
                          : 'no fix yet'}
                      </span>
                      {last?.speedMps != null && (
                        <span>{Math.round(last.speedMps * 2.237)} mph</span>
                      )}
                      {last?.batteryPct != null && last.batteryPct <= 20 && (
                        <span className="flex items-center gap-0.5 text-destructive">
                          <BatteryLow className="h-3 w-3" />
                          {last.batteryPct}%
                        </span>
                      )}
                    </div>
                    {t.onSite && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Sharing pauses while the phone is away — this is normal.
                      </p>
                    )}
                    {t.isStale && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          void forceEnd(t.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            void forceEnd(t.id);
                          }
                        }}
                        className="mt-1.5 inline-block cursor-pointer text-[11px] font-medium text-destructive underline-offset-2 hover:underline"
                      >
                        Force end
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="order-1 lg:order-2">
          <TrackingMap tracks={tracks} focus={focus} />
        </div>
      </div>
    </div>
  );
}

function LiveBadge({ state }: { state: LiveState }) {
  const map = {
    connecting: { text: 'Connecting…', cls: 'bg-muted text-muted-foreground', Icon: Radio },
    live: { text: 'Live', cls: 'bg-primary/10 text-primary', Icon: Radio },
    polling: { text: 'Polling', cls: 'bg-muted text-muted-foreground', Icon: WifiOff },
    unavailable: { text: 'Offline', cls: 'bg-amber-100 text-amber-800', Icon: WifiOff },
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${map.cls}`}
    >
      <map.Icon className="h-3 w-3" />
      {map.text}
    </span>
  );
}
