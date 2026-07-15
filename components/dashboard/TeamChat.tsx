'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { register } from 'vue-advanced-chat';
import { MessageCircle, X } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';
import { DEFAULT_ROOM_ID } from '@/lib/chat';
import type { ChatMessageDTO, ChatRoom, CurrentUser } from '@/lib/types';

// register() defines the <vue-advanced-chat> custom element; guard so it only
// runs once per page (it throws if the element is already defined).
let registered = false;

const PANEL_HEIGHT = 520;

// Indigo theme mapped onto vue-advanced-chat's style slots (shadow DOM, so
// Tailwind can't reach inside — theming goes through these variables).
const CHAT_STYLES = {
  general: {
    color: '#111827',
    colorButton: '#4f46e5',
    colorButtonClear: '#4f46e5',
    backgroundInput: '#f9fafb',
    colorPlaceholder: '#9ca3af',
    colorCaret: '#4f46e5',
  },
  container: { borderRadius: '0px', boxShadow: 'none', border: 'none' },
  header: { background: '#ffffff', colorRoomName: '#111827', colorRoomInfo: '#6b7280' },
  footer: { background: '#ffffff', backgroundReply: '#eef2ff' },
  content: { background: '#ffffff' },
  message: {
    background: '#f3f4f6',
    backgroundMe: '#4f46e5',
    color: '#111827',
    colorStarted: '#9ca3af',
    colorDate: '#9ca3af',
    colorTimestamp: '#9ca3af',
    backgroundDate: '#eef2ff',
  },
};

// vue-advanced-chat message shape; date/timestamp are display labels formatted
// in the viewer's own timezone from the API's ISO `createdAt`.
interface VueMessage {
  _id: string;
  roomId: string;
  content: string;
  senderId: string;
  username: string;
  date: string;
  timestamp: string;
  deleted?: boolean;
}

function toVueMessage(m: ChatMessageDTO): VueMessage {
  const d = new Date(m.createdAt);
  return {
    _id: m._id,
    roomId: m.roomId,
    content: m.content,
    senderId: m.senderId,
    username: m.username,
    date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    timestamp: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    deleted: m.deleted,
  };
}

export function TeamChat() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<VueMessage[]>([]);
  const roomId = DEFAULT_ROOM_ID;
  const chatRef = useRef<HTMLElement | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      if (!res.ok) return;
      const { messages: dtos }: { messages: ChatMessageDTO[] } = await res.json();
      setMessages(dtos.map(toVueMessage));
    } catch {
      // ignore transient network errors
    }
  }, [roomId]);

  // Register the web component (client-only) + load initial data.
  useEffect(() => {
    if (!registered) {
      try {
        register();
      } catch {
        // already defined (e.g. React fast refresh) — safe to ignore
      }
      registered = true;
    }
    setReady(true);

    (async () => {
      try {
        const [meRes, roomsRes] = await Promise.all([fetch('/api/me'), fetch('/api/chat/rooms')]);
        if (meRes.ok) setMe(await meRes.json());
        if (roomsRes.ok) {
          const { rooms: incoming }: { rooms: ChatRoom[] } = await roomsRes.json();
          setRooms(incoming);
        }
      } catch {
        // ignore
      }
      loadMessages();
    })();
  }, [loadMessages]);

  // Real-time: refetch when a chat-message event fires for our room.
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return; // Pusher not configured — skip realtime, don't crash
    const channel = pusher.subscribe('dashboard');
    const handler = (data: { roomId?: string }) => {
      if (!data?.roomId || data.roomId === roomId) loadMessages();
    };
    channel.bind('chat-message', handler);
    return () => {
      channel.unbind('chat-message', handler);
    };
  }, [roomId, loadMessages]);

  // Wire web-component events via addEventListener (robust across React versions).
  useEffect(() => {
    const el = chatRef.current;
    if (!el || !me) return;

    const onSend = async (e: Event) => {
      // Vue custom elements wrap emit() arguments into an array on event.detail.
      const raw = (e as CustomEvent).detail;
      const payload = (Array.isArray(raw) ? raw[0] : raw) as
        | { roomId?: string; content?: string }
        | undefined;
      const content = (payload?.content ?? '').trim();
      if (!content) return;
      try {
        await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: payload?.roomId || roomId, content }),
        });
        await loadMessages();
      } catch {
        // ignore
      }
    };
    const onFetch = () => loadMessages();

    el.addEventListener('send-message', onSend);
    el.addEventListener('fetch-messages', onFetch);
    return () => {
      el.removeEventListener('send-message', onSend);
      el.removeEventListener('fetch-messages', onFetch);
    };
  }, [me, ready, roomId, loadMessages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close team chat' : 'Open team chat'}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-500"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {ready && (
        <div
          aria-hidden={!open}
          className={`fixed bottom-20 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-200 ${
            open
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          }`}
          style={{ height: PANEL_HEIGHT }}
        >
          {me && (
            <vue-advanced-chat
              ref={chatRef}
              current-user-id={me.id}
              room-id={roomId}
              rooms={JSON.stringify(rooms)}
              messages={JSON.stringify(messages)}
              rooms-loaded="true"
              messages-loaded="true"
              single-room="true"
              show-add-room="false"
              show-files="false"
              show-audio="false"
              show-reaction-emojis="false"
              show-new-messages-divider="false"
              height={`${PANEL_HEIGHT}px`}
              styles={JSON.stringify(CHAT_STYLES)}
            />
          )}
        </div>
      )}
    </>
  );
}
