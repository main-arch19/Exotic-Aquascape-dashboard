'use client';

import { MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/context/DashboardContext';
import { JobState, WorkerPunchStatus } from '@/lib/types';

function jobStateBadge(state: JobState) {
  switch (state) {
    case 'arrived':
      return <Badge className="border-0 bg-emerald-100 text-emerald-700">On Site</Badge>;
    case 'delayed':
      return <Badge className="border-0 bg-amber-100 text-amber-700">Delayed</Badge>;
    case 'leaving':
      return <Badge className="border-0 bg-sky-100 text-sky-700">In Transit</Badge>;
    case 'pending':
      return <Badge className="border-0 bg-indigo-100 text-indigo-700">Dispatched</Badge>;
    default:
      return <Badge className="border-0 bg-gray-100 text-gray-500">Idle</Badge>;
  }
}

function punchBadge(status: WorkerPunchStatus) {
  if (status === 'clocked_in') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Clocked In
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />
      Off Clock
    </span>
  );
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function WorkerStatusGrid() {
  const { workerStatuses, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {workerStatuses.map((ws) => (
        <Card key={ws.workerId} className="border-gray-200 bg-white shadow-sm transition-colors hover:border-gray-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {initials(ws.workerName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{ws.workerName}</p>
                  {jobStateBadge(ws.jobState)}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    {punchBadge(ws.punchStatus)}
                  </div>
                  {ws.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[140px]">{ws.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
