'use client';

import { useState } from 'react';
import { Loader2, LogIn, LogOut, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDashboard } from '@/context/DashboardContext';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function WorkerClockPanel() {
  const { workerStatuses, refresh } = useDashboard();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleClock = async (workerId: string, action: 'punch-in' | 'punch-out') => {
    setLoadingId(workerId);
    try {
      const res = await fetch(`/api/workers/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback((f) => ({ ...f, [workerId]: data.error ?? 'Error' }));
      } else {
        setFeedback((f) => ({ ...f, [workerId]: action === 'punch-in' ? 'Clocked in!' : 'Clocked out!' }));
        await refresh();
      }
    } catch {
      setFeedback((f) => ({ ...f, [workerId]: 'Network error' }));
    } finally {
      setLoadingId(null);
      setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[workerId]; return n; }), 2500);
    }
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <UserCheck className="h-4 w-4 text-indigo-500" />
          Worker Clock Management
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {workerStatuses.map((ws) => {
          const isLoading = loadingId === ws.workerId;
          const msg = feedback[ws.workerId];
          const isClockedIn = ws.punchStatus === 'clocked_in';

          return (
            <div key={ws.workerId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {initials(ws.workerName)}
              </div>

              {/* Name + status */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{ws.workerName}</p>
                <span className={`flex items-center gap-1 text-xs ${isClockedIn ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${isClockedIn ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  {isClockedIn ? 'Clocked In' : 'Off Clock'}
                </span>
              </div>

              {/* Feedback message */}
              {msg && (
                <span className="text-xs text-indigo-600 font-medium">{msg}</span>
              )}

              {/* Action button */}
              <button
                disabled={isLoading}
                onClick={() => handleClock(ws.workerId, isClockedIn ? 'punch-out' : 'punch-in')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  isClockedIn
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isClockedIn ? (
                  <><LogOut className="h-3.5 w-3.5" />Clock Out</>
                ) : (
                  <><LogIn className="h-3.5 w-3.5" />Clock In</>
                )}
              </button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
