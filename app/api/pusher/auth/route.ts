import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { pusher, TRACKING_MONITOR_CHANNEL } from '@/lib/pusher-server';

export const runtime = 'nodejs';

/**
 * Pusher private-channel authorization.
 *
 * This single `if` is the entire leak surface for worker coordinates: there is
 * one channel carrying them, pusher-js refuses to subscribe to a private channel
 * without a server-signed token, and this endpoint issues that token only to an
 * approved manager or CEO.
 */
export async function POST(req: NextRequest) {
  try {
    // Deliberate departure from the house style of destructuring the body
    // outside try/catch: that convention turns malformed input into an
    // unhandled 500, and this is a security endpoint that will be probed.
    // A clean 400 is worth the inconsistency.
    // pusher-js posts application/x-www-form-urlencoded by default.
    const form = await req.formData();
    const socketId = String(form.get('socket_id') ?? '');
    const channel = String(form.get('channel_name') ?? '');

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    // Allowlist the exact name rather than pattern-matching `private-*`.
    // Exactly one private channel exists; a pattern would silently authorize
    // any future channel someone adds.
    if (channel !== TRACKING_MONITOR_CHANNEL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!me.approved || (me.role !== 'manager' && me.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(pusher.authorizeChannel(socketId, channel));
  } catch (error) {
    console.error('Error in pusher/auth:', error);
    return NextResponse.json({ error: 'Failed to authorize channel' }, { status: 500 });
  }
}
