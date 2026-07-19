// Tracking types live here rather than in lib/types.ts so the Phase 2 swap
// (browser capture -> Capacitor background capture) stays contained to
// lib/tracking/ and never reaches into the shared dashboard types.

/** A single normalized location fix. Produced by a LocationSource. */
export interface Ping {
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  batteryPct: number | null;
  /** ISO 8601, stamped from the DEVICE clock when the fix happened. Never the send time. */
  capturedAt: string;
}

export type TrackerStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface LocationError {
  code:
    | 'permission_denied'
    | 'position_unavailable'
    | 'timeout'
    | 'insecure_context'
    | 'unknown';
  message: string;
}

export interface LocationSourceOptions {
  minIntervalMs: number;
  minDistanceM: number;
  maxAccuracyM: number;
}

/**
 * The Phase 2 seam.
 *
 * Phase 1 ships webSource (watchPosition, foreground only). Phase 2 adds a
 * nativeSource backed by Capacitor background geolocation and swaps ONLY this
 * object — throttling, buffering, batching, retry, the API routes, the schema
 * and every piece of UI live above this interface and are reused verbatim.
 */
export interface LocationSource {
  readonly kind: 'web' | 'native';
  /** True if the runtime can produce fixes at all (API present, secure context). */
  isSupported(): boolean;
  /**
   * Emits RAW fixes. The hook applies the throttle gate — a source must not
   * pre-filter, or the gate's accuracy rejection and stationary suppression
   * would be applied twice with different thresholds.
   *
   * `opts` is passed in even though the hook does the gating: the native source
   * hands minDistanceM straight to the OS distance filter, which is what makes
   * background tracking battery-viable. The hook's gate then sits harmlessly
   * on top.
   */
  start(
    onPing: (p: Ping) => void,
    onError: (e: LocationError) => void,
    opts: LocationSourceOptions
  ): Promise<void>;
  stop(): Promise<void>;
}

/** A trip as returned by /api/trips. */
export interface TripDTO {
  id: string;
  workerId: string;
  workerName: string;
  jobId: string | null;
  destination: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt: string | null;
  endReason: 'worker' | 'manager' | 'auto_timeout' | null;
  /** Server-computed: active but silent for over 30 minutes. */
  isStale?: boolean;
  /** Most recent fix, when the endpoint includes one. */
  lastPing?: Ping | null;
}

/** Payload of the `ping-batch` Pusher event. */
export interface PingBatchEvent {
  tripId: string;
  workerId: string;
  workerName: string;
  pings: Ping[];
}

/** Payload of the `trip-ended` Pusher event. */
export interface TripEndedEvent {
  tripId: string;
  workerId: string;
  endedAt: string;
  endReason: 'worker' | 'manager' | 'auto_timeout';
}

/**
 * Bumping this re-prompts every worker for consent. Do that whenever the
 * ConsentDialog copy materially changes — the version is recorded per trip in
 * field_trips.consent_version, so old trips keep the text that was actually
 * shown at the time.
 */
export const CONSENT_VERSION = 'v1';
