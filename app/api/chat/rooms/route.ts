import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ChatRoom, ChatRoomUser } from '@/lib/types';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  const [{ data: rooms, error: roomsError }, { data: users }] = await Promise.all([
    supabase.from('chat_rooms').select('*').order('created_at', { ascending: true }),
    supabase.from('users').select('id, name, avatar_url'),
  ]);

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  // The web component renders avatars/typing from each room's `users` list.
  // v1 is a single shared room, so every known user is a member.
  const roomUsers: ChatRoomUser[] = (users || []).map((u) => ({
    _id: u.id,
    username: u.name,
    avatar: u.avatar_url ?? undefined,
  }));
  if (!roomUsers.some((u) => u._id === me.id)) {
    roomUsers.push({ _id: me.id, username: me.name, avatar: me.avatarUrl });
  }

  const result: ChatRoom[] = (rooms || []).map((r) => ({
    roomId: r.id,
    roomName: r.name,
    users: roomUsers,
  }));

  return NextResponse.json({ rooms: result });
}
