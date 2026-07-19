/**
 * The tracking channel name, in its own module with no imports.
 *
 * Both the server publisher and the browser subscriber need this string. It
 * cannot live in lib/pusher-server.ts, because importing that from a client
 * component would pull the Pusher Node SDK — and the PUSHER_SECRET reference —
 * into the browser bundle.
 */
export const TRACKING_MONITOR_CHANNEL = 'private-tracking-monitor';
