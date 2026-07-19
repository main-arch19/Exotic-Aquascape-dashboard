import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { triggerTracking } from '@/lib/pusher-server';

export const runtime = 'nodejs'; // the Pusher SDK is Node-only
export const dynamic = 'force-dynamic';

const PUSHER_CHUNK = 50; // ~4.5 KB serialized, against Pusher's 10 KB limit

/**
 * Validation here uses zod, unlike the older routes' hand-rolled truthy checks.
 * That is deliberate and scoped to the new tracking routes: this endpoint takes
 * an unbounded array of six-field numeric objects from an untrusted client on
 * the app's most sensitive data path, and `if (!lat)` is actively WRONG for
 * coordinates — lat === 0 is a real place off West Africa and falsy in JS.
 */
const PingSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracyM: z.number().finite().min(0).nullable().optional(),
  speedMps: z.number().finite().min(0).nullable().optional(),
  headingDeg: z.number().finite().min(0).lt(360).nullable().optional(),
  batteryPct: z.number().int().min(0).max(100).nullable().optional(),
  capturedAt: z.string().datetime({ offset: true }),
});

const EnvelopeSchema = z.object({
  tripId: z.string().min(1).max(64),
  // Parsed as unknown so one bad reading from a flaky sensor doesn't reject an
  // entire 50-ping dead-zone flush. Each ping is validated individually below.
  pings: z.array(z.unknown()).min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Deliberate exception: this route calls auth.getUser() directly rather than
    // getCurrentUser(), which costs a second round trip to resolve a ROLE this
    // route does not need. Ping authorization is identity + trip ownership, and
    // ownership is enforced by the location_pings_insert RLS policy in the same
    // statement as the insert. At ~180 requests/worker/hour, halving the round
    // trips on the hot path earns the inconsistency. Every other new tracking
    // route uses getCurrentUser().
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const envelope = EnvelopeSchema.safeParse(await req.json());
    if (!envelope.success) {
      return NextResponse.json({ error: 'Invalid ping payload' }, { status: 400 });
    }
    const { tripId, pings: rawPings } = envelope.data;

    const valid: z.infer<typeof PingSchema>[] = [];
    let rejected = 0;
    for (const raw of rawPings) {
      const parsed = PingSchema.safeParse(raw);
      if (parsed.success) valid.push(parsed.data);
      else rejected++;
    }
    if (valid.length === 0) {
      return NextResponse.json({ ok: true, accepted: 0, rejected });
    }

    // De-dupe within the batch BEFORE upserting. Postgres cannot resolve a row
    // that conflicts with another row in the same statement — ON CONFLICT
    // raises "cannot affect row a second time" rather than ignoring it. The
    // client retries whole batches, so in-batch duplicates are routine.
    valid.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const seen = new Set<string>();
    const deduped = valid.filter((p) => {
      if (seen.has(p.capturedAt)) return false;
      seen.add(p.capturedAt);
      return true;
    });

    const rows = deduped.map((p) => ({
      trip_id: tripId,
      // From the session, NEVER the body. A spoofed workerId in the payload is
      // ignored here and would be rejected by RLS even if it weren't.
      worker_id: user.id,
      lat: p.lat,
      lng: p.lng,
      accuracy_m: p.accuracyM ?? null,
      speed_mps: p.speedMps ?? null,
      heading_deg: p.headingDeg ?? null,
      battery_pct: p.batteryPct ?? null,
      captured_at: p.capturedAt,
      source: 'web' as const,
    }));

    // trip_id comes from the body but is safe: location_pings_insert re-verifies
    // that the trip is ours AND still active, in this same statement.
    const { error } = await supabase
      .from('location_pings')
      .upsert(rows, { onConflict: 'trip_id,captured_at', ignoreDuplicates: true });

    if (error) {
      // An RLS rejection means the trip is ended or not ours. Returning 403
      // (rather than 500) is what tells the client to drop the batch and stop
      // retrying instead of blocking every later ping behind a poison pill.
      const isPolicyViolation =
        error.code === '42501' || /row-level security/i.test(error.message);
      if (isPolicyViolation) {
        return NextResponse.json({ error: 'Trip not active' }, { status: 403 });
      }
      console.error('Error inserting location pings:', error);
      return NextResponse.json({ error: 'Failed to record pings' }, { status: 500 });
    }

    // after() keeps the Pusher publish off the response path. This deviates from
    // the house convention of `await triggerUpdate(...)` last: at 180 req/hr per
    // worker the round trip to Pusher would dominate this endpoint's latency,
    // and the database write is already durable by here.
    //
    // Trade-off to know about: a Pusher outage now surfaces as a silently frozen
    // map rather than a slow ingest. TrackingMonitor binds connection-state
    // listeners so a manager sees "Live updates unavailable" instead of assuming
    // nobody moved.
    after(async () => {
      const { data: trip } = await supabase
        .from('field_trips')
        .select('worker_name')
        .eq('id', tripId)
        .maybeSingle();

      for (let i = 0; i < deduped.length; i += PUSHER_CHUNK) {
        await triggerTracking('ping-batch', {
          tripId,
          workerId: user.id,
          workerName: trip?.worker_name ?? '',
          pings: deduped.slice(i, i + PUSHER_CHUNK),
        });
      }
    });

    return NextResponse.json({ ok: true, accepted: rows.length, rejected });
  } catch (error) {
    console.error('Error in location/ping:', error);
    return NextResponse.json({ error: 'Failed to record pings' }, { status: 500 });
  }
}
