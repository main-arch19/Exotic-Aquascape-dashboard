import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { triggerTracking } from '@/lib/pusher-server';
import { tripRowToDTO, type TripRow } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  jobId: z.string().min(1).max(64).nullable().optional(),
  destination: z.string().max(300).nullable().optional(),
  consentVersion: z.string().min(1).max(16),
});

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!me.approved) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { jobId, consentVersion } = parsed.data;
    let destination = parsed.data.destination ?? null;

    // Session-bound client so RLS applies. NEVER createServiceRoleClient() for
    // tracking — service_role bypasses RLS and would make every policy in
    // migration 005 decorative.
    const supabase = await createClient();

    // Enforce "we only track people on the clock" as an invariant rather than a
    // policy sentence. This is cheap and it is exactly the kind of control that
    // matters if the tracking is ever challenged.
    const { data: workerStatus } = await supabase
      .from('worker_statuses')
      .select('punch_status')
      .eq('worker_id', me.id)
      .maybeSingle();

    if (workerStatus?.punch_status === 'clocked_out') {
      return NextResponse.json(
        { error: 'Clock in before starting a trip' },
        { status: 409 }
      );
    }

    if (jobId) {
      const { data: job } = await supabase
        .from('jobs')
        .select('address')
        .eq('id', jobId)
        .maybeSingle();
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      destination = destination ?? job.address;
    }

    const { data: inserted, error } = await supabase
      .from('field_trips')
      .insert({
        id: Math.random().toString(36).slice(2, 10), // house convention
        worker_id: me.id,
        worker_name: me.name,
        job_id: jobId ?? null,
        destination,
        status: 'active',
        consent_granted_at: new Date().toISOString(),
        consent_version: consentVersion,
      })
      .select('*')
      .single();

    if (error) {
      // Unique violation on field_trips_one_active_per_worker: a trip is already
      // running. Return it with 200 — double-tapping Start should be idempotent,
      // not a red banner.
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('field_trips')
          .select('*')
          .eq('worker_id', me.id)
          .eq('status', 'active')
          .maybeSingle();
        if (existing) {
          return NextResponse.json({
            success: true,
            trip: tripRowToDTO(existing as TripRow),
          });
        }
      }
      console.error('Error starting trip:', error);
      return NextResponse.json({ error: 'Failed to start trip' }, { status: 500 });
    }

    const trip = tripRowToDTO(inserted as TripRow);

    await supabase.from('event_logs').insert({
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type: 'trip_started',
      worker_id: me.id,
      worker_name: me.name,
      message: destination
        ? `${me.name} started a trip to ${destination}`
        : `${me.name} started a trip`,
      job_id: jobId ?? null,
      severity: 'info',
    });

    // No triggerUpdate('state-changed') — nothing in /api/state changed, and
    // that channel is public. Tracking events go only to the private channel.
    after(() => triggerTracking('trip-started', { trip }));

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('Error in trips/start:', error);
    return NextResponse.json({ error: 'Failed to start trip' }, { status: 500 });
  }
}
