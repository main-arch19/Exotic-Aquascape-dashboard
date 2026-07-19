'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineM } from './geo';
import { PingQueue } from './queue';
import { createWebSource } from './webSource';
import type { LocationError, LocationSource, Ping, TrackerStatus } from './types';

/**
 * The single seam between location capture and everything else.
 *
 * Swap `source` for the Capacitor-backed native source in Phase 2 and nothing
 * else in this file, the API routes, the schema or the UI needs to change.
 */

const DEFAULTS = {
  minIntervalMs: 8_000,
  minDistanceM: 75,
  maxAccuracyM: 200,
  stationaryHeartbeatMs: 60_000,
  stationaryRadiusM: 15,
  flushIntervalMs: 20_000,
  batchSize: 50,
  backoffMinMs: 2_000,
  backoffMaxMs: 60_000,
};

export interface UseLocationTrackerOptions {
  /** Defaults to the browser source. The Phase 2 swap point. */
  source?: LocationSource;
  minIntervalMs?: number;
  minDistanceM?: number;
  maxAccuracyM?: number;
  stationaryHeartbeatMs?: number;
  flushIntervalMs?: number;
  batchSize?: number;
}

export interface LocationTracker {
  start: (tripId: string) => Promise<void>;
  stop: () => Promise<void>;
  status: TrackerStatus;
  lastPing: Ping | null;
  error: LocationError | null;
  queuedCount: number;
}

export function useLocationTracker(
  opts: UseLocationTrackerOptions = {}
): LocationTracker {
  const cfg = { ...DEFAULTS, ...opts };

  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [lastPing, setLastPing] = useState<Ping | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);

  const sourceRef = useRef<LocationSource | null>(null);
  const queueRef = useRef<PingQueue | null>(null);
  const tripIdRef = useRef<string | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(cfg.backoffMinMs);
  const flushingRef = useRef(false);

  // Gate state — refs, not state, so updating them never triggers a render.
  const lastAcceptedRef = useRef<Ping | null>(null);

  if (sourceRef.current === null) {
    sourceRef.current = opts.source ?? createWebSource();
  }

  const syncQueueCount = useCallback(() => {
    setQueuedCount(queueRef.current?.size ?? 0);
  }, []);

  /**
   * Flush up to batchSize pings.
   *
   * BATCHING IS A COST CONSTRAINT, NOT A PERFORMANCE NICETY. Pusher bills per
   * message published AND per delivery to each subscriber. At one publish per
   * ping, ten workers with three managers watching costs ~144k messages/day
   * against a 200k/day free tier. Batched at ~20s it is ~58k. If someone
   * "simplifies" this to POST each ping individually, the bill or the outage
   * arrives quietly.
   */
  const flush = useCallback(async () => {
    const queue = queueRef.current;
    const tripId = tripIdRef.current;
    if (!queue || !tripId || flushingRef.current) return;
    if (queue.size === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    flushingRef.current = true;
    try {
      // One batch per call. The interval timer picks up any remainder, which
      // keeps a huge dead-zone backlog from monopolizing the connection.
      const batch = queue.peek(cfg.batchSize);
      if (batch.length === 0) return;

      let res: Response;
      try {
        res = await fetch('/api/location/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, pings: batch }),
        });
      } catch {
        // Network failure. KEEP the batch: the POST may have committed
        // server-side with only the response lost, and the (trip_id,
        // captured_at) unique constraint makes the retry idempotent. Dropping
        // here is how you lose a dead zone.
        backoffRef.current = Math.min(backoffRef.current * 2, cfg.backoffMaxMs);
        return;
      }

      if (res.ok) {
        queue.remove(batch.length);
        backoffRef.current = cfg.backoffMinMs;
        syncQueueCount();
        return;
      }

      if (res.status === 401) {
        // Signed out. Stop rather than spin against a wall.
        setError({
          code: 'unknown',
          message: 'You have been signed out. Sign in again to resume tracking.',
        });
        setStatus('error');
        return;
      }

      if (res.status === 403 || res.status === 400) {
        // 403: the trip is no longer active or is not ours — RLS rejected the
        // insert. 400: malformed and will never parse. Either way the batch is
        // a poison pill; retrying it forever would block every ping behind it.
        queue.drop(batch.length);
        syncQueueCount();
        if (res.status === 403) {
          setError({
            code: 'unknown',
            message: 'This trip is no longer active. Start a new trip to keep sharing.',
          });
          setStatus('error');
        }
        return;
      }

      // 429/5xx — keep and back off.
      backoffRef.current = Math.min(backoffRef.current * 2, cfg.backoffMaxMs);
    } finally {
      flushingRef.current = false;
      syncQueueCount();
    }
  }, [cfg.batchSize, cfg.backoffMaxMs, cfg.backoffMinMs, syncQueueCount]);

  /** Throttle gate. Order matters. */
  const acceptPing = useCallback(
    (ping: Ping): boolean => {
      // 1. Accuracy reject. Browsers routinely return a first fix derived from
      //    IP or wifi with 2,000-20,000m accuracy. Without this filter the map
      //    shows the worker teleporting to the middle of the county and back,
      //    and every reviewer concludes the feature is broken.
      if (ping.accuracyM !== null && ping.accuracyM > cfg.maxAccuracyM) {
        return false;
      }

      const prev = lastAcceptedRef.current;
      if (!prev) return true;

      const elapsed =
        new Date(ping.capturedAt).getTime() - new Date(prev.capturedAt).getTime();
      const distance = haversineM(prev, ping);

      // 2. The spec gate: whichever fires first.
      const byInterval = elapsed >= cfg.minIntervalMs;
      const byDistance = distance >= cfg.minDistanceM;
      if (!byInterval && !byDistance) return false;

      // 3. Stationary suppression. A worker parked at a job site still trips the
      //    interval branch every 8s, which is ~450 rows/hour of the same
      //    coordinate. Suppressing that drops a parked worker to ~60/hour — a 7x
      //    reduction with zero loss of route fidelity, and it is the difference
      //    between filling the Supabase free tier in 10 weeks and not.
      if (
        !byDistance &&
        distance < cfg.stationaryRadiusM &&
        elapsed < cfg.stationaryHeartbeatMs
      ) {
        return false;
      }

      return true;
    },
    [
      cfg.maxAccuracyM,
      cfg.minIntervalMs,
      cfg.minDistanceM,
      cfg.stationaryRadiusM,
      cfg.stationaryHeartbeatMs,
    ]
  );

  const start = useCallback(
    async (tripId: string) => {
      const source = sourceRef.current;
      if (!source) return;

      if (!source.isSupported()) {
        setStatus('unavailable');
        setError({
          code: 'insecure_context',
          message:
            'Location is unavailable in this browser. It requires a secure (https) connection.',
        });
        return;
      }

      tripIdRef.current = tripId;
      queueRef.current = new PingQueue(tripId);
      lastAcceptedRef.current = null;
      backoffRef.current = cfg.backoffMinMs;
      setError(null);
      setStatus('requesting');
      syncQueueCount();

      await source.start(
        (ping) => {
          setStatus('tracking');
          if (!acceptPing(ping)) return;
          lastAcceptedRef.current = ping;
          setLastPing(ping);
          queueRef.current?.enqueue(ping);
          syncQueueCount();
        },
        (err) => {
          setError(err);
          setStatus(err.code === 'permission_denied' ? 'denied' : 'error');
        },
        {
          minIntervalMs: cfg.minIntervalMs,
          minDistanceM: cfg.minDistanceM,
          maxAccuracyM: cfg.maxAccuracyM,
        }
      );
    },
    [
      acceptPing,
      cfg.backoffMinMs,
      cfg.maxAccuracyM,
      cfg.minDistanceM,
      cfg.minIntervalMs,
      syncQueueCount,
    ]
  );

  const stop = useCallback(async () => {
    await sourceRef.current?.stop();
    // Best-effort final flush so the last few fixes of a trip aren't stranded.
    await flush();
    queueRef.current?.clear();
    queueRef.current = null;
    tripIdRef.current = null;
    lastAcceptedRef.current = null;
    setStatus('idle');
    setLastPing(null);
    setQueuedCount(0);
  }, [flush]);

  // Flush loop. Reschedules itself using the current backoff so a failing
  // endpoint stretches the interval instead of hammering it.
  useEffect(() => {
    if (status !== 'tracking' && status !== 'requesting') return;

    let cancelled = false;
    const tick = async () => {
      await flush();
      if (cancelled) return;
      const delay =
        backoffRef.current > DEFAULTS.backoffMinMs
          ? backoffRef.current
          : cfg.flushIntervalMs;
      flushTimerRef.current = setTimeout(tick, delay);
    };
    flushTimerRef.current = setTimeout(tick, cfg.flushIntervalMs);

    return () => {
      cancelled = true;
      if (flushTimerRef.current !== null) clearTimeout(flushTimerRef.current);
    };
  }, [status, flush, cfg.flushIntervalMs]);

  // Reconnect: flush immediately rather than waiting out the interval.
  useEffect(() => {
    const onOnline = () => {
      backoffRef.current = DEFAULTS.backoffMinMs;
      void flush();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  // Persist synchronously when the page may be about to die. A timer-debounced
  // write does not survive a tab kill; these handlers are the last chance.
  useEffect(() => {
    const persist = () => queueRef.current?.persistNow();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { start, stop, status, lastPing, error, queuedCount };
}
