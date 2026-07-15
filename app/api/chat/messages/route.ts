import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_ROOM_ID, rowToChatMessage, type ChatMessageRow } from '@/lib/chat';

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roomId = req.nextUrl.searchParams.get('roomId') || DEFAULT_ROOM_ID;

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = (data as ChatMessageRow[] | null ?? []).map(rowToChatMessage);
  return NextResponse.json({ messages });
}
