'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CurrentUser, DashboardState, EventLog } from '@/lib/types';
import { getPusherClient } from '@/lib/pusher-client';

interface DashboardContextValue extends DashboardState {
  events: EventLog[];
  refresh: () => Promise<void>;
  isLoading: boolean;
  /** The signed-in user. Null while loading, or if the session is gone. */
  me: CurrentUser | null;
  meLoading: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const EMPTY_STATE: DashboardState = {
  users: [],
  workerStatuses: [],
  jobs: [],
  tools: [],
  timesheets: [],
  kpis: { activeJobs: 0, toolsCheckedOut: 0, delaysToday: 0 },
};

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());

  // The current user lives here rather than in the page, because the agent job
  // list and the assignment UI both need to know who is acting.
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CurrentUser | null) => setMe(data))
      .catch(() => {})
      .finally(() => setMeLoading(false));
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data: DashboardState = await res.json();
      setState(data);
    } catch {
      // network errors are silent in demo
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/feed');
      if (!res.ok) return;
      const { events: incoming }: { events: EventLog[] } = await res.json();
      const fresh = incoming.filter((e) => !seenIds.current.has(e.id));
      if (fresh.length > 0) {
        fresh.forEach((e) => seenIds.current.add(e.id));
        setEvents((prev) => {
          const merged = [...fresh, ...prev];
          return merged.slice(0, 100);
        });
        // Also refresh state so KPIs + worker cards stay in sync
        fetchState();
      }
    } catch {
      // silent
    }
  }, [fetchState]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchState(), fetchFeed()]);
  }, [fetchState, fetchFeed]);

  // Initial load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchState();
      await fetchFeed();
      setIsLoading(false);
    })();
  }, [fetchState, fetchFeed]);

  // Subscribe to Pusher real-time updates
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return; // Pusher not configured — skip realtime, don't crash
    const channel = pusher.subscribe('dashboard');

    const handleStateChanged = () => {
      fetchState();
      fetchFeed();
    };

    channel.bind('state-changed', handleStateChanged);

    return () => {
      channel.unbind('state-changed', handleStateChanged);
      pusher.unsubscribe('dashboard');
    };
  }, [fetchState, fetchFeed]);

  return (
    <DashboardContext.Provider
      value={{ ...state, events, refresh, isLoading, me, meLoading }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within <DashboardProvider>');
  return ctx;
}
