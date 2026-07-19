-- Soft-revoke flag for removing a team member without destroying their history.
--
-- A hard DELETE is not an option here: timesheets.worker_id and
-- event_logs.worker_id both declare ON DELETE CASCADE (001_create_tables.sql),
-- so removing a departed employee would take every hour they ever logged with
-- them. Revoking sets approved = false (which already gates all access) and
-- flags revoked = true so the UI can tell a removed employee apart from a new
-- sign-up still waiting for approval.

ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;
