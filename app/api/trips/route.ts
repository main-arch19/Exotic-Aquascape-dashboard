import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Ping, TripDTO } from '@/lib/tracking/types';
import {
  pingRowToDTO,
  tripRowToDTO,
  STALE_AFTER_MS,
  type PingRow,
  type TripRow,
} from './shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PING_COLS = 'lat, lng, accuracy_m, speed_mps, heading_deg, battery_pct, captured_at';
const HISTORY_CAP = 5_000;

/**
 * GET /api/trips?scope=mine|active|history
 *
 * Authorization note: none of these queries carries a manual role filter. RLS is
 * the filter — a worker asking for someone else's trip gets an empty array from
 * the database rather than from an `if`. That is the point of enabling RLS here:
 * the authorization cannot drift out of sync with the query builder.
 */
export async function GET(req: NextRequest) {
  // Env preflight, matching /api/state and /api/feed.
  const missing = (
    ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const
  ).filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing Supabase env vars:', missing);
    return NextResponse.json(
      { error: 'Missing Supabase env vars', missing },
      { status: 500 }
    );
  }

  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const scope = req.nextUrl.searchParams.get('scope') ?? 'active';

    if (scope === 'history') {
      const tripId = req.nextUrl.searchParams.get('tripId');
      if (!tripId) {
        return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
      }

      const { data: tripRow, error: tripErr } = await supabase
        .from('field_trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();
      if (tripErr) throw tripErr;
      if (!tripRow) {
        // Also the RLS-denied case: indistinguishable by design.
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
      }

      const { count } = await supabase
        .from('location_pings')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);

      const total = count ?? 0;
      // Downsample server-side past the cap. A 10-hour trip is ~4,500 points and
      // Leaflet polylines get sluggish past a few thousand.
      const stride = total > HISTORY_CAP ? Math.ceil(total / HISTORY_CAP) : 1;

      const { data: pingRows, error: pingErr } = await supabase
        .from('location_pings')
        .select(PING_COLS)
        .eq('trip_id', tripId)
        .order('captured_at', { ascending: true })
        .limit(stride > 1 ? total : HISTORY_CAP);
      if (pingErr) throw pingErr;

      // Downsample by index rather than by id: gaps from the retention delete
      // would make `id % stride` cluster unevenly across the route.
      const rows = (pingRows ?? []) as unknown as PingRow[];
      const pings: Ping[] = (
        stride > 1 ? rows.filter((_, i) => i % stride === 0) : rows
      ).map(pingRowToDTO);

      return NextResponse.json({
        trip: tripRowToDTO(tripRow as TripRow),
        pings,
        downsampled: stride > 1,
      });
    }

    // scope=recent — completed + active trips, for the replay picker. Capped
    // rather than paginated: the picker is a dropdown, not a report.
    if (scope === 'recent') {
      const { data, error } = await supabase
        .from('field_trips')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json({
        trips: ((data ?? []) as TripRow[]).map(tripRowToDTO),
      });
    }

    // scope=mine — the caller's own active trip, for TripControlPanel. The
    // worker never needs to know its own user id: RLS resolves it.
    if (scope === 'mine') {
      const { data, error } = await supabase
        .from('field_trips')
        .select('*')
        .eq('worker_id', me.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({
        trip: data ? tripRowToDTO(data as TripRow) : null,
      });
    }

    // scope=active — every active trip with its latest fix, for the monitor's
    // initial paint before Pusher takes over. Returns [] for a worker by policy.
    const { data: tripRows, error } = await supabase
      .from('field_trips')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    if (error) throw error;

    const rows = (tripRows ?? []) as TripRow[];
    const now = Date.now();

    const trips: TripDTO[] = await Promise.all(
      rows.map(async (row) => {
        const { data: lastRows } = await supabase
          .from('location_pings')
          .select(PING_COLS)
          .eq('trip_id', row.id)
          .order('captured_at', { ascending: false })
          .limit(1);

        const last = (lastRows ?? [])[0] as PingRow | undefined;
        const lastAt = last ? new Date(last.captured_at).getTime() : null;

        return {
          ...tripRowToDTO(row),
          lastPing: last ? pingRowToDTO(last) : null,
          // Computed here so the UI can offer "Force end" without a background
          // job watching for abandoned trips.
          isStale:
            lastAt === null
              ? now - new Date(row.started_at).getTime() > STALE_AFTER_MS
              : now - lastAt > STALE_AFTER_MS,
        };
      })
    );

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Error in trips GET:', error);
    return NextResponse.json(
      { error: 'Failed to load trips', detail: String(error) },
      { status: 500 }
    );
  }
}
