import type { SupabaseClient } from '@supabase/supabase-js';
import { tripRowToDTO, type TripRow } from '@/app/api/trips/shared';
import type { TripDTO } from './types';
import type { CurrentUser } from '@/lib/types';

export type StartTripResult =
  | { ok: true; trip: TripDTO; alreadyActive: boolean }
  | { ok: false; error: string; status: number };

/**
 * Opens a field_trip for the acting worker.
 *
 * IMPORTANT: `supabase` MUST be the session-bound client from
 * lib/supabase/server.ts `createClient()`. The field_trips_insert policy in
 * migration 006 requires `worker_id = auth.uid()::text`, and 006 explicitly
 * forbids service-role for tracking tables — passing a service-role client here
 * makes every policy in that migration decorative, and nothing fails loudly.
 *
 * This is why a manager cannot open a trip on an agent's behalf: acceptance has
 * to come from the agent's own session. That constraint is the feature.
 */
export async function startTrip(opts: {
  supabase: SupabaseClient;
  me: CurrentUser;
  jobId: string | null;
  destination: string | null;
  consentVersion: string;
}): Promise<StartTripResult> {
  const { supabase, me, jobId, consentVersion } = opts;
  let destination = opts.destination;

  if (jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('address')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) {
      return { ok: false, error: 'Job not found', status: 404 };
    }
    destination = destination ?? job.address;
  }

  const { data: inserted, error } = await supabase
    .from('field_trips')
    .insert({
      id: Math.random().toString(36).slice(2, 10), // house convention
      worker_id: me.id,
      worker_name: me.name,
      job_id: jobId,
      destination,
      status: 'active',
      consent_granted_at: new Date().toISOString(),
      consent_version: consentVersion,
    })
    .select('*')
    .single();

  if (error) {
    // Unique violation on field_trips_one_active_per_worker. Return the running
    // trip instead of an error — an agent double-tapping Accept on a flaky
    // connection is the common case, not an edge case.
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('field_trips')
        .select('*')
        .eq('worker_id', me.id)
        .eq('status', 'active')
        .maybeSingle();
      if (existing) {
        return {
          ok: true,
          trip: tripRowToDTO(existing as TripRow),
          alreadyActive: true,
        };
      }
    }
    console.error('Error starting trip:', error);
    return { ok: false, error: 'Failed to start trip', status: 500 };
  }

  return { ok: true, trip: tripRowToDTO(inserted as TripRow), alreadyActive: false };
}
