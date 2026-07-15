import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { triggerUpdate } from '@/lib/pusher-server';
import { DEFAULT_ROOM_ID, rowToChatMessage, type ChatMessageRow } from '@/lib/chat';

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const roomId: string = body.roomId || DEFAULT_ROOM_ID;
  const content: string = typeof body.content === 'string' ? body.content.trim() : '';

  if (!content) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  // Sender identity is taken from the authenticated user, never from the request
  // body — this is the whole reason for adding real auth.
  const row: ChatMessageRow = {
    id: Math.random().toString(36).slice(2, 10),
    room_id: roomId,
    sender_id: me.id,
    username: me.name,
    content,
    created_at: new Date().toISOString(),
    deleted: false,
  };

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from('chat_messages').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Broadcast a lightweight signal on the existing `dashboard` channel; clients
  // re-fetch messages for the affected room.
  await triggerUpdate('chat-message', { roomId });

  return NextResponse.json({ message: rowToChatMessage(row) });
}
