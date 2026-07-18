'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return; // OneSignal not configured — skip init entirely

    OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== 'production',
    }).catch(() => {
      // OneSignal rejects (e.g. "App not configured for web push") when the
      // OneSignal app has no web-push setup. Swallow it so it doesn't surface
      // as an uncaught error in the console.
    });
  }, []);

  return null;
}
