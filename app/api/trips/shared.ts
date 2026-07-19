import type { Ping, TripDTO } from '@/lib/tracking/types';

/** Shape of a field_trips row as returned by PostgREST. */
export interface TripRow {
  id: string;
  worker_id: string;
  worker_name: string;
  job_id: string | null;
  destination: string | null;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  end_reason: 'worker' | 'manager' | 'auto_timeout' | null;
}

/** Shape of a location_pings row as returned by PostgREST. */
export interface PingRow {
  lat: number;
  lng: number;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  battery_pct: number | null;
  captured_at: string;
}

/** A trip is stale when it is still active but has gone quiet. */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export function tripRowToDTO(row: TripRow): TripDTO {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    jobId: row.job_id,
    destination: row.destination,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    endReason: row.end_reason,
  };
}

export function pingRowToDTO(row: PingRow): Ping {
  return {
    lat: row.lat,
    lng: row.lng,
    accuracyM: row.accuracy_m,
    speedMps: row.speed_mps,
    headingDeg: row.heading_deg,
    batteryPct: row.battery_pct,
    capturedAt: row.captured_at,
  };
}
