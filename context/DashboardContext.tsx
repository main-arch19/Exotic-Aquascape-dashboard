'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DashboardState, EventLog } from '@/lib/types';

interface DashboardContextValue extends DashboardState {
  events: EventLog[];
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const EMPTY_STATE: DashboardState = {
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

  // Poll feed every 4 s
  useEffect(() => {
    const id = setInterval(fetchFeed, 4_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  // Simulate random field-worker events every 8–14 s for demo realism
  useEffect(() => {
    const simulate = async () => {
      const workers = ['w1', 'w2', 'w3', 'w4', 'w5', 'w7', 'w8'];
      const reasons = [
        'Heavy traffic on I-95',
        'Client not home yet',
        'Equipment issue on site',
        'Flat tire on US-1',
        'Waiting for gate code from homeowner',
        'Supply pickup delay',
      ];
      const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

      const roll = Math.random();
      if (roll < 0.3) {
        await fetch('/api/delay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId: pick(workers), reason: pick(reasons) }),
        });
      } else if (roll < 0.65) {
        await fetch('/api/tools/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId: pick(workers), toolId: pick(['t3', 't5', 't8', 't10', 't12']) }),
        });
      } else {
        await fetch('/api/tools/return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId: pick(workers), toolId: pick(['t1', 't2', 't4', 't6', 't7', 't9', 't11']) }),
        });
      }
    };

    const schedule = () => {
      const delay = 8_000 + Math.random() * 6_000;
      return setTimeout(async () => {
        await simulate();
        timerId = schedule();
      }, delay);
    };

    let timerId = schedule();
    return () => clearTimeout(timerId);
  }, []);

  return (
    <DashboardContext.Provider value={{ ...state, events, refresh, isLoading }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within <DashboardProvider>');
  return ctx;
}
