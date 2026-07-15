-- Team chat: shared cross-view communication backed by Supabase auth.
--
-- Sender identity comes from Supabase Auth (auth.uid()). On first authenticated
-- request the app upserts a matching row into `users` keyed by the auth uid, so
-- `sender_id` lines up with a users row without a hard FK (names are denormalized
-- onto each message, matching the event_logs pattern). DB access continues to go
-- through the service-role client in API routes, so no RLS policies are added
-- here (consistent with the existing tables).

-- Shared chat room(s). v1 seeds a single global "Team Chat" room that every
-- authenticated user shares; the schema allows adding more rooms later.
CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at);

-- Seed the single shared room.
INSERT INTO chat_rooms (id, name) VALUES ('team', 'Team Chat')
ON CONFLICT (id) DO NOTHING;
