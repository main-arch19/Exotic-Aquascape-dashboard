'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== 'production',
    });
  }, []);

  return null;
}
