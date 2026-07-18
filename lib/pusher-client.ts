'use client';

import PusherJs from 'pusher-js';

let pusherClient: PusherJs | null = null;

/**
 * Returns a shared Pusher client, or null when Pusher isn't configured in this
 * environment (e.g. the NEXT_PUBLIC_* vars weren't set at build time). Returning
 * null instead of constructing with an undefined key avoids a synchronous throw
 * from pusher-js that would otherwise crash the whole page on mount.
 */
export function getPusherClient(): PusherJs | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!pusherClient) {
    pusherClient = new PusherJs(key, { cluster });
  }
  return pusherClient;
}
