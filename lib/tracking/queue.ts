'use client';

import type { Ping } from './types';

/**
 * Offline ping buffer, persisted to localStorage.
 *
 * Why persisted and not just in memory: the buffer exists for dead zones, and in
 * a dead zone the phone is in a pocket or a truck cradle — precisely the
 * conditions in which iOS Safari evicts the backgrounded tab under memory
 * pressure and the page reloads on return. An in-memory queue would lose exactly
 * the segment the buffer was built to capture. sessionStorage has the same
 * problem (it dies with the tab). IndexedDB is more robust but asynchronous, and
 * that is real complexity for a payload that peaks around 200 KB against
 * localStorage's synchronous 5 MB budget.
 */

const STORAGE_KEY = 'ea:tracking:queue:v1';
const MAX_PINGS = 2_000;
const WRITE_DEBOUNCE_MS = 1_000;

interface Persisted {
  tripId: string;
  pings: Ping[];
}

export class PingQueue {
  private tripId: string;
  private pings: Ping[] = [];
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(tripId: string) {
    this.tripId = tripId;
    this.restore();
  }

  private restore() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Persisted;
      // A queue left over from a previous trip is discarded, not replayed. The
      // location_pings_insert policy would reject it anyway (wrong trip, or the
      // trip is no longer active) — this just avoids the pointless round trip.
      if (parsed.tripId === this.tripId && Array.isArray(parsed.pings)) {
        this.pings = parsed.pings;
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Corrupt payload, quota error, or storage disabled. Start empty.
    }
  }

  /** Debounced so a burst of enqueues isn't N synchronous JSON.stringify calls. */
  private schedulePersist() {
    if (typeof window === 'undefined') return;
    if (this.writeTimer !== null) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => this.persistNow(), WRITE_DEBOUNCE_MS);
  }

  /** Synchronous write, for pagehide/visibilitychange where a timer won't fire. */
  persistNow() {
    if (typeof window === 'undefined') return;
    if (this.writeTimer !== null) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    try {
      const payload: Persisted = { tripId: this.tripId, pings: this.pings };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded or storage disabled. The in-memory queue still works for
      // this page lifetime; losing persistence is strictly better than throwing
      // inside a pagehide handler.
    }
  }

  enqueue(ping: Ping) {
    this.pings.push(ping);
    if (this.pings.length > MAX_PINGS) {
      // Downsample the oldest half (keep every 2nd) rather than dropping the
      // oldest outright. A very long outage then degrades the route's
      // RESOLUTION instead of amputating its beginning, and storage stays
      // bounded either way.
      const half = Math.floor(this.pings.length / 2);
      const thinned = this.pings.slice(0, half).filter((_, i) => i % 2 === 0);
      this.pings = [...thinned, ...this.pings.slice(half)];
    }
    this.schedulePersist();
  }

  /** Oldest-first slice for the next flush. Does not remove — see remove(). */
  peek(n: number): Ping[] {
    return this.pings.slice(0, n);
  }

  /** Called only after a 2xx, so a lost response never loses pings. */
  remove(n: number) {
    this.pings = this.pings.slice(n);
    this.schedulePersist();
  }

  /** Poison-pill path: a 400/403 batch that would never succeed on retry. */
  drop(n: number) {
    this.remove(n);
  }

  clear() {
    this.pings = [];
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing useful to do.
      }
    }
  }

  get size() {
    return this.pings.length;
  }
}
