'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import type { CurrentUser } from '@/lib/types';

/**
 * Initializes OneSignal and ties the device to the signed-in user.
 *
 * Three things have to be true for a targeted push to arrive, and if any one is
 * missing every send is a silent no-op:
 *   1. init  — the SDK is loaded
 *   2. login — the device carries an external id (users.id), which is what
 *              lib/onesignal.ts targets via include_aliases
 *   3. permission — the browser has actually granted notifications
 *
 * This component is mounted in app/layout.tsx, OUTSIDE DashboardProvider, so it
 * does its own /api/me fetch rather than restructuring the layout for one value.
 */
export function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return; // OneSignal not configured — skip init entirely

    let cancelled = false;

    (async () => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== 'production',
        });
      } catch {
        // OneSignal rejects (e.g. "App not configured for web push") when the
        // OneSignal app has no web-push setup. Swallow it so it doesn't surface
        // as an uncaught error in the console.
        return;
      }
      if (cancelled) return;

      let me: CurrentUser | null = null;
      try {
        const res = await fetch('/api/me');
        me = res.ok ? await res.json() : null;
      } catch {
        return;
      }
      if (cancelled) return;

      if (!me) {
        // Signed out. Detach the device, or a shared or borrowed phone keeps
        // receiving the previous agent's job assignments.
        try {
          await OneSignal.logout();
        } catch {
          // Nothing useful to do.
        }
        return;
      }

      try {
        // Ties this device to users.id. Without it the device carries no
        // identity and lib/onesignal.ts cannot address it.
        await OneSignal.login(me.id);
      } catch {
        return;
      }

      // Only field agents receive pushes (job assignments), so only they get
      // prompted. Prompting a manager for notifications they will never receive
      // just trains people to hit Block.
      if (me.role !== 'worker') return;

      try {
        if (OneSignal.Notifications.permission) return; // already granted
        await OneSignal.Notifications.requestPermission();
      } catch {
        // Denied, dismissed, or unsupported. The job list is the channel of
        // record — push is a nudge — so this is never fatal.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
