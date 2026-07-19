-- 006_field_tracking.sql
-- Live GPS field-worker route tracking (Phase 1: browser capture).
--
-- Note: app_role() gates on approved = true, so a member revoked via
-- 005_user_revoked.sql (which sets approved = false) loses tracking access
-- through every policy below without any extra check.
--
-- Deliberate deviations from 001/002/004, each justified:
--
--  * TIMESTAMPTZ, not TIMESTAMP. Every other table uses TIMESTAMP. GPS fixes are
--    absolute instants stamped by device clocks in unknown zones and are replayed
--    in strict order across devices; a zone-less column silently corrupts that.
--
--  * location_pings uses an IDENTITY bigint PK, not an app-generated 8-char
--    base36 TEXT id. At ~450 rows/worker/hour the 36^8 keyspace reaches a real
--    birthday-collision probability within months, and nothing ever references a
--    ping by id. field_trips KEEPS the TEXT convention: low volume, FK-compatible
--    with jobs(id) TEXT, and it travels in URLs and payloads.
--
--  * RLS is ENABLED here. It is disabled on the other seven tables. These two hold
--    employee movement data and are read through the session-bound anon client, so
--    these policies are the real access control, not decoration.
--
-- RETENTION (not automated here — wire to pg_cron or an external scheduler):
--   DELETE FROM location_pings WHERE captured_at < now() - interval '30 days';
--   At 10 workers x 8h/day this table grows ~1.1M rows (~200 MB) per month
--   against a 500 MB free tier. This delete is not optional.

BEGIN;

-- ---------------------------------------------------------------------------
-- Role helper.
--
-- users.id is TEXT holding the Supabase auth uid verbatim (lib/auth.ts inserts
-- `user.id` with no transform); there is no FK to auth.users, the linkage is by
-- convention. auth.uid() returns UUID, so every comparison casts uuid->text:
-- auth.uid()::text yields the canonical lowercase hyphenated form, identical to
-- what supabase-js wrote. Never cast the other direction (users.id::uuid) — any
-- legacy non-uuid id would raise and take down the whole policy.
--
-- Unauthenticated: auth.uid() IS NULL -> comparison NULL -> no row -> NULL
-- return -> every policy that calls this evaluates false. Fails closed.
--
-- SECURITY DEFINER + STABLE: evaluated once per statement, and does not require
-- the caller to hold any grant on users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users
  WHERE id = auth.uid()::text AND approved = true
$$;

REVOKE ALL ON FUNCTION public.app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_role() TO authenticated;

-- ---------------------------------------------------------------------------
-- field_trips — one row per "drive to a destination"
-- ---------------------------------------------------------------------------
CREATE TABLE field_trips (
  id                  TEXT PRIMARY KEY,
  worker_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name         TEXT NOT NULL,          -- denormalized, matches worker_statuses/event_logs
  job_id              TEXT REFERENCES jobs(id) ON DELETE SET NULL,  -- optional; ad-hoc trips have none
  destination         TEXT,                   -- auto-filled from jobs.address, or free text
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  end_reason          TEXT CHECK (end_reason IN ('worker', 'manager', 'auto_timeout')),
  consent_granted_at  TIMESTAMPTZ NOT NULL,   -- per-trip record of affirmative consent
  consent_version     TEXT NOT NULL DEFAULT 'v1',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT field_trips_ended_shape CHECK (
    (status = 'active' AND ended_at IS NULL) OR
    (status = 'ended'  AND ended_at IS NOT NULL)
  )
);

-- One active trip per worker, enforced in the database. Mirrors the
-- users_single_ceo partial-unique-index pattern from migration 004.
CREATE UNIQUE INDEX field_trips_one_active_per_worker
  ON field_trips (worker_id) WHERE status = 'active';

CREATE INDEX idx_field_trips_worker_started ON field_trips (worker_id, started_at DESC);
CREATE INDEX idx_field_trips_status         ON field_trips (status);
CREATE INDEX idx_field_trips_job            ON field_trips (job_id);

-- ---------------------------------------------------------------------------
-- location_pings — the route
-- ---------------------------------------------------------------------------
CREATE TABLE location_pings (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id      TEXT NOT NULL REFERENCES field_trips(id) ON DELETE CASCADE,
  -- worker_id is denormalized from field_trips so the SELECT policy is a plain
  -- column comparison instead of a join on every row of a million-row table.
  worker_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy_m   REAL     CHECK (accuracy_m >= 0),
  speed_mps    REAL     CHECK (speed_mps >= 0),
  heading_deg  REAL     CHECK (heading_deg >= 0 AND heading_deg < 360),
  battery_pct  SMALLINT CHECK (battery_pct BETWEEN 0 AND 100),
  captured_at  TIMESTAMPTZ NOT NULL,                  -- device clock: when the fix happened
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),    -- server clock: when we got it
  source       TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'native')),

  -- Makes offline replay idempotent: if a batch POST succeeds but the response
  -- is lost in a dead zone, the client retries and the upsert drops the
  -- duplicates instead of doubling the route.
  CONSTRAINT location_pings_dedup UNIQUE (trip_id, captured_at)
);

CREATE INDEX idx_location_pings_trip   ON location_pings (trip_id, captured_at);
CREATE INDEX idx_location_pings_worker ON location_pings (worker_id, captured_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE field_trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;

-- FORCE applies policies even to the table owner. service_role still bypasses
-- RLS, which is exactly why tracking reads must NOT go through
-- createServiceRoleClient() — see lib/supabase/server.ts.
ALTER TABLE field_trips    FORCE ROW LEVEL SECURITY;
ALTER TABLE location_pings FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.field_trips    FROM anon;
REVOKE ALL ON public.location_pings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.field_trips     TO authenticated;
GRANT SELECT, INSERT         ON public.location_pings  TO authenticated;
-- No DELETE grant and no DELETE policy: pings are append-only for app clients.
-- IDENTITY columns need no separate sequence grant (PG 10+).

-- --- field_trips policies ---

CREATE POLICY field_trips_select ON field_trips FOR SELECT TO authenticated
  USING (
    worker_id = auth.uid()::text
    OR public.app_role() IN ('manager', 'ceo')
  );

-- A worker may only open a trip for themselves. Even if worker_id were taken
-- from a request body, the database rejects the mismatch.
CREATE POLICY field_trips_insert ON field_trips FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = auth.uid()::text
    AND public.app_role() IS NOT NULL   -- i.e. an approved user of any role
  );

-- Workers end their own trips; managers/CEO can force-end a stuck one.
CREATE POLICY field_trips_update ON field_trips FOR UPDATE TO authenticated
  USING (
    worker_id = auth.uid()::text
    OR public.app_role() IN ('manager', 'ceo')
  )
  WITH CHECK (
    worker_id = auth.uid()::text
    OR public.app_role() IN ('manager', 'ceo')
  );

-- --- location_pings policies ---

CREATE POLICY location_pings_select ON location_pings FOR SELECT TO authenticated
  USING (
    worker_id = auth.uid()::text
    OR public.app_role() IN ('manager', 'ceo')
  );

-- The load-bearing policy. A caller may only append to a trip that is (a) theirs
-- and (b) still active. This means /api/location/ping does NOT need a separate
-- ownership SELECT round trip — the database authorizes in the same statement.
CREATE POLICY location_pings_insert ON location_pings FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM field_trips t
      WHERE t.id = location_pings.trip_id
        AND t.worker_id = auth.uid()::text
        AND t.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- event_logs: the type CHECK is a closed enum, so new event types require
-- rebuilding the constraint. event_logs_type_check is Postgres' auto-generated
-- name for the inline column check in 001; confirm with \d event_logs if this
-- DROP silently no-ops and the ADD then fails on existing rows.
-- ---------------------------------------------------------------------------
ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_type_check;
ALTER TABLE event_logs ADD CONSTRAINT event_logs_type_check CHECK (
  type IN (
    'punch_in', 'punch_out', 'arrived', 'leaving', 'delayed',
    'tool_checkout', 'tool_return', 'job_created',
    'trip_started', 'trip_ended'
  )
);

COMMIT;
