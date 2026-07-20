-- 007_job_assignment.sql
-- Assignment-driven dispatch: a manager assigns an existing job to an agent, the
-- agent accepts, and acceptance is what opens a field_trip (006).
--
-- TIMESTAMPTZ on the new columns, matching 006 and deviating from 001's naked
-- TIMESTAMP: "when did they accept" anchors the tracked window, and a zone-less
-- acceptance instant sitting next to a zone-aware consent_granted_at is a bug
-- waiting for the first DST boundary.

BEGIN;

-- ---------------------------------------------------------------------------
-- jobs_workers becomes the assignment record.
--
-- Columns here rather than a new job_assignments table: the junction's PK
-- (job_id, worker_id) already IS an assignment's identity. This costs no data
-- migration, keeps the existing embedded select working, and makes it
-- structurally impossible for "who is assigned" and "who accepted" to disagree.
-- Reassignment history comes from event_logs, without a second source of truth.
-- ---------------------------------------------------------------------------
ALTER TABLE jobs_workers
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  -- SET NULL, not CASCADE: deleting a departed manager must not delete the
  -- assignments they made.
  ADD COLUMN IF NOT EXISTS assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL;

UPDATE jobs_workers jw
   SET assigned_at = j.created_at
  FROM jobs j
 WHERE j.id = jw.job_id AND jw.assigned_at IS NULL;

-- Work already in flight was implicitly accepted. Without this backfill every
-- historical job shows "awaiting acceptance" forever, and agents mid-job at
-- deploy lose their Arrive/Complete buttons.
UPDATE jobs_workers jw
   SET accepted_at = j.created_at
  FROM jobs j
 WHERE j.id = jw.job_id
   AND jw.accepted_at IS NULL
   AND j.status IN ('in_progress', 'completed', 'delayed');

-- The PK is (job_id, worker_id), so "every job for this agent" — the single
-- hottest new query, run on every agent dashboard load — has no usable index.
CREATE INDEX IF NOT EXISTS idx_jobs_workers_worker ON jobs_workers (worker_id);

-- ---------------------------------------------------------------------------
-- jobs.manager_id — the owning manager, distinct from field assignment.
--
-- QuickJobForm flattens [managerId, workerId] into jobs_workers undifferentiated.
-- That was cosmetic before; now it's a defect, because a manager sitting in
-- jobs_workers would receive an assignment push, get an Accept button, and start
-- GPS tracking on themselves.
-- ---------------------------------------------------------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS manager_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- worker_statuses bootstrap.
--
-- Nothing in this codebase has ever INSERTed this table — every reference is a
-- SELECT or an UPDATE. A newly approved user therefore has no row and 404s on
-- punch-in, arrive, leave and delay. Worse, the punch gate reads
-- `punch_status === 'clocked_out'`, and for a missing row that is
-- `undefined === 'clocked_out'` = false — so the gate FAILS OPEN for exactly
-- the users who cannot be clocked in.
--
-- A trigger rather than application code because there are two user-insert
-- paths (including the CEO seat claim in lib/auth.ts, which never passes through
-- admin/approve) plus manual SQL. worker_statuses is a 1:1 extension of users;
-- that is what triggers are for.
-- ---------------------------------------------------------------------------
ALTER TABLE worker_statuses
  ALTER COLUMN punch_status SET DEFAULT 'clocked_out',
  ALTER COLUMN job_state    SET DEFAULT 'idle';

CREATE OR REPLACE FUNCTION public.ensure_worker_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO worker_statuses (worker_id, worker_name, punch_status, job_state)
  VALUES (NEW.id, NEW.name, 'clocked_out', 'idle')
  ON CONFLICT (worker_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_ensure_worker_status ON users;
CREATE TRIGGER users_ensure_worker_status
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_worker_status();

-- worker_name is denormalized into worker_statuses, event_logs and field_trips.
-- Keep this one in sync; the log tables are point-in-time records and must NOT
-- be rewritten when someone changes their name.
CREATE OR REPLACE FUNCTION public.sync_worker_status_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE worker_statuses SET worker_name = NEW.name WHERE worker_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_sync_worker_status_name ON users;
CREATE TRIGGER users_sync_worker_status_name
  AFTER UPDATE OF name ON users
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.sync_worker_status_name();

-- Backfill the existing fleet, not just future sign-ups. This creates rows for
-- managers and the CEO too, so the UI must filter worker_statuses by role
-- (WorkerClockPanel, FieldWorkersSection) or they will start appearing as field
-- workers. That filter ships with this migration.
INSERT INTO worker_statuses (worker_id, worker_name, punch_status, job_state)
SELECT u.id, u.name, 'clocked_out', 'idle'
  FROM users u
 WHERE NOT EXISTS (SELECT 1 FROM worker_statuses ws WHERE ws.worker_id = u.id);

-- ---------------------------------------------------------------------------
-- event_logs.type is a closed CHECK enum; every addition rebuilds it.
-- Must stay in sync with EventType in lib/types.ts.
--
-- If this DROP silently no-ops the ADD will fail on existing rows — confirm the
-- constraint name with \d event_logs first.
-- ---------------------------------------------------------------------------
ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_type_check;
ALTER TABLE event_logs ADD CONSTRAINT event_logs_type_check CHECK (
  type IN (
    'punch_in', 'punch_out', 'arrived', 'leaving', 'delayed',
    'tool_checkout', 'tool_return', 'job_created',
    'trip_started', 'trip_ended',
    'job_assigned', 'job_unassigned', 'job_accepted'
  )
);

COMMIT;
