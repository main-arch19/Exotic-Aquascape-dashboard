import Pusher from 'pusher';
import { TRACKING_MONITOR_CHANNEL } from './tracking/channel';

// Exported because /api/pusher/auth needs authorizeChannel() to sign private
// channel subscriptions. Prefer the helpers below for publishing.
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

/**
 * Re-exported for server callers. The name itself is defined in
 * lib/tracking/channel.ts so the browser can import it without dragging this
 * module (and PUSHER_SECRET) into the client bundle.
 *
 * It is the only channel carrying worker coordinates: private, and
 * /api/pusher/auth grants a subscription only to an approved manager or CEO, so
 * a worker device holds no token for any coordinate-bearing channel and cannot
 * receive another worker's location.
 *
 * Nothing tracking-related goes on the public `dashboard` channel, not even a
 * coordinate-free trip-started: "who is en route to whose house" is itself
 * sensitive, and anyone holding NEXT_PUBLIC_PUSHER_KEY (which ships in the
 * client bundle) can subscribe to a public channel.
 */
export { TRACKING_MONITOR_CHANNEL };

export type TrackingEvent = 'trip-started' | 'trip-ended' | 'ping-batch';

/**
 * Publishes to the manager/CEO-only tracking channel.
 *
 * Swallows errors like triggerUpdate does, and here that is load-bearing: this
 * runs inside after(), where a throw becomes a detached unhandled rejection, and
 * a dropped realtime frame must never fail an ingest that already committed to
 * the database.
 */
export async function triggerTracking(
  event: TrackingEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await pusher.trigger(TRACKING_MONITOR_CHANNEL, event, data);
  } catch (error) {
    console.error(`[Pusher] ✗ Failed to trigger tracking event ${event}:`, error);
  }
}

export async function triggerUpdate(
  event: string = 'state-changed',
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    console.log(`[Pusher] ✉  Broadcasting event: ${event}`);
    await pusher.trigger('dashboard', event, data);
    console.log(`[Pusher] ✓ Event sent`);
  } catch (error) {
    console.error(`[Pusher] ✗ Failed to trigger event:`, error);
  }
}
