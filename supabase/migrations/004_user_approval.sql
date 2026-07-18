-- CEO user-approval workflow.
--
-- Everyone who signs in gets a `users` row (created by lib/auth.ts). New users
-- start unapproved and have no dashboard access until the CEO approves them and
-- assigns a role. The CEO seat is claimed by the first sign-in.

ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Enforce exactly one CEO at the database level: a second row with role='ceo'
-- will violate this partial unique index (the app also guards against it).
CREATE UNIQUE INDEX IF NOT EXISTS users_single_ceo ON users (role) WHERE role = 'ceo';
