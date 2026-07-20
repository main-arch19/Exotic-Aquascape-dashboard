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
  /**
   * Server-computed: active, silent for over 30 minutes, AND not on site.
   *
   * The on-site exclusion matters. Tracking now runs through the whole job, and
   * a phone in a pocket produces nothing, so without it every agent on site
   * would be permanently flagged — training managers to ignore the warning
   * including on the drives where it actually means something.
   */
  isStale?: boolean;
  /** Arrived at the worksite: sharing is expected to be quiet, not broken. */
  onSite?: boolean;
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
 * Version of the location-sharing notice.
 *
 * Bumping this re-prompts everyone (CONSENT_STORAGE_KEY is templated on it) and
 * the server rejects an accept carrying a stale version, so nobody can record
 * acknowledgment of text they were never shown. field_trips.consent_version
 * pins each trip to the notice actually displayed at the time.
 *
 * v1 -> v2: tracking is no longer a drive the worker chose to start. It now runs
 * from accepting a dispatched job until the job is marked complete — including
 * time on site — and it is a condition of accepting the work rather than
 * something the worker can switch off.
 */
export const CONSENT_VERSION = 'v2';
