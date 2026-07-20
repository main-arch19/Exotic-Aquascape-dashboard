'use client';

import { Users, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDashboard } from '@/context/DashboardContext';
import { JobState } from '@/lib/types';

function jobStateBadge(state: JobState) {
  switch (state) {
    case 'arrived':  return <Badge className="border-0 bg-emerald-100 text-emerald-700">On Site</Badge>;
    case 'delayed':  return <Badge className="border-0 bg-amber-100 text-amber-700">Delayed</Badge>;
    case 'leaving':  return <Badge className="border-0 bg-sky-100 text-sky-700">In Transit</Badge>;
    case 'pending':  return <Badge className="border-0 bg-indigo-100 text-indigo-700">Dispatched</Badge>;
    default:         return <Badge className="border-0 bg-gray-100 text-gray-500">Idle</Badge>;
  }
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function FieldWorkersSection() {
  const { workerStatuses, users } = useDashboard();
  // Migration 007 backfills a worker_statuses row for every user, so filter to
  // actual field agents or managers and the CEO appear here as field workers.
  const roleById = new Map(users.map((u) => [u.id, u.role]));
  const active = workerStatuses.filter(
    (w) => w.punchStatus === 'clocked_in' && roleById.get(w.workerId) === 'worker'
  );

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Users className="h-4 w-4 text-indigo-500" />
          Field Workers
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-gray-400">{active.length} active</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {active.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No workers clocked in.</p>
        )}
        {active.map((w) => (
          <div key={w.workerId} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {initials(w.workerName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{w.workerName}</p>
                {jobStateBadge(w.jobState)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className={`flex items-center gap-1 text-xs ${w.punchStatus === 'clocked_in' ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <Clock className="h-3 w-3 text-gray-300" />
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${w.punchStatus === 'clocked_in' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  {w.punchStatus === 'clocked_in' ? 'Clocked In' : 'Off Clock'}
                </span>
                {w.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[180px]">{w.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
