'use client';

import type {
  LocationError,
  LocationSource,
  LocationSourceOptions,
  Ping,
} from './types';

/**
 * Browser capture source: navigator.geolocation.watchPosition + Screen Wake Lock.
 *
 * THE HONEST LIMITATION — read this before promising anyone live tracking:
 *
 * This source only produces fixes while the tab is foregrounded with the screen
 * on. Wake Lock keeps the screen awake; it does NOT grant background execution.
 * When the worker locks the phone, switches to Maps for directions, or takes a
 * call, iOS Safari suspends the page and watchPosition stops firing entirely;
 * Android Chrome throttles it to near-zero. The route will show a straight line
 * across the gap.
 *
 * This is not a bug and it is not fixable within a web app. It is the entire
 * reason Phase 2 (Capacitor + background geolocation) exists. Since the use case
 * is driving between jobs — precisely when the worker is most likely using their
 * phone for navigation — the gap is the common case, not the edge case.
 */

// Minimal shape of the Battery Status API. Chrome/Android only: removed from
// Firefox, never shipped in Safari. Not in lib.dom.d.ts, hence the local type.
interface BatteryManager {
  level: number;
}
type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
};

function toLocationError(err: GeolocationPositionError): LocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        code: 'permission_denied',
        message:
          'Location permission was denied. You will need to re-enable it in your browser settings — the app cannot ask again.',
      };
    case err.POSITION_UNAVAILABLE:
      return {
        code: 'position_unavailable',
        message: 'No location fix available. Check that GPS is on.',
      };
    case err.TIMEOUT:
      return { code: 'timeout', message: 'Timed out waiting for a location fix.' };
    default:
      return { code: 'unknown', message: err.message || 'Unknown location error.' };
  }
}

export function createWebSource(): LocationSource {
  let watchId: number | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let battery: BatteryManager | null = null;
  let visibilityHandler: (() => void) | null = null;

  async function acquireWakeLock() {
    // Throws on insecure contexts and iOS < 16.4. A failed wake lock degrades
    // tracking (screen sleeps sooner) but must never stop it.
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      wakeLock = null;
    }
  }

  return {
    kind: 'web',

    isSupported() {
      return (
        typeof navigator !== 'undefined' &&
        'geolocation' in navigator &&
        typeof window !== 'undefined' &&
        window.isSecureContext
      );
    },

    async start(onPing, onError, opts: LocationSourceOptions) {
      // Geolocation AND Wake Lock are both secure-context-only. This is the most
      // common "why doesn't it work on my phone" cause: localhost counts as
      // secure, but a LAN address like 192.168.1.x:3000 does not.
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        onError({
          code: 'insecure_context',
          message:
            'Location requires a secure connection (https). Open the app over https, not a local network address.',
        });
        return;
      }
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        onError({
          code: 'position_unavailable',
          message: 'This browser does not support location.',
        });
        return;
      }

      // Resolve the BatteryManager ONCE and read .level synchronously per ping.
      // Awaiting getBattery() on every fix would add a microtask hop to the hot
      // path for a number that changes on the order of minutes.
      const nav = navigator as NavigatorWithBattery;
      if (typeof nav.getBattery === 'function') {
        try {
          battery = await nav.getBattery();
        } catch {
          battery = null;
        }
      }

      await acquireWakeLock();

      // The sentinel is auto-released whenever the page is hidden, so
      // re-acquiring on visibilitychange is mandatory, not an optimization —
      // without it the screen sleeps the first time the worker glances away and
      // never wakes again for the rest of the trip.
      visibilityHandler = () => {
        if (document.visibilityState === 'visible' && wakeLock === null) {
          void acquireWakeLock();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const c = pos.coords;
          const ping: Ping = {
            lat: c.latitude,
            lng: c.longitude,
            accuracyM: Number.isFinite(c.accuracy) ? c.accuracy : null,
            speedMps:
              c.speed !== null && Number.isFinite(c.speed) && c.speed >= 0
                ? c.speed
                : null,
            headingDeg:
              c.heading !== null && Number.isFinite(c.heading) && c.heading >= 0
                ? c.heading % 360
                : null,
            batteryPct: battery
              ? Math.max(0, Math.min(100, Math.round(battery.level * 100)))
              : null,
            // Device clock at fix time, NOT send time. The dead-zone replay is
            // worthless if these cluster at reconnect.
            capturedAt: new Date(pos.timestamp).toISOString(),
          };
          onPing(ping);
        },
        (err) => onError(toLocationError(err)),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: Math.max(20_000, opts.minIntervalMs * 2),
        }
      );
    },

    async stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        visibilityHandler = null;
      }
      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch {
          // Already released (page hidden). Nothing to do.
        }
        wakeLock = null;
      }
      battery = null;
    },
  };
}
