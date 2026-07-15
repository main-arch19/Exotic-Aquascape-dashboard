import type { ChatMessageDTO } from '@/lib/types';

export const DEFAULT_ROOM_ID = 'team';

// Raw `chat_messages` row shape (snake_case, as stored in Supabase).
export interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  username: string;
  content: string;
  created_at: string;
  deleted: boolean;
}

export function rowToChatMessage(row: ChatMessageRow): ChatMessageDTO {
  return {
    _id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    username: row.username,
    content: row.content,
    createdAt: row.created_at,
    deleted: row.deleted || undefined,
  };
}
