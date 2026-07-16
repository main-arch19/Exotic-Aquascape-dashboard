'use client';

import { Briefcase, Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDashboard } from '@/context/DashboardContext';
import { JobStatus } from '@/lib/types';

function statusBadge(status: JobStatus) {
  switch (status) {
    case 'in_progress': return <Badge className="border-0 bg-emerald-100 text-emerald-700">In Progress</Badge>;
    case 'delayed':     return <Badge className="border-0 bg-amber-100 text-amber-700">Delayed</Badge>;
    case 'scheduled':   return <Badge className="border-0 bg-indigo-100 text-indigo-700">Scheduled</Badge>;
    case 'completed':   return <Badge className="border-0 bg-gray-100 text-gray-500">Completed</Badge>;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, 'h:mm a');
}

export function ActiveJobsSection() {
  const { jobs, workerStatuses } = useDashboard();
  const nameById = new Map(workerStatuses.map((w) => [w.workerId, w.workerName]));
  const active = jobs.filter((j) => j.status !== 'completed');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          Active Jobs Today
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-gray-400">{active.length} jobs</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {active.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No active jobs.</p>
        )}
        {active.map((job) => {
          const workers =
            job.assignedWorkerIds.map((id) => nameById.get(id) ?? id).join(', ') || 'Unassigned';
          return (
            <div key={job.id} className="flex flex-col gap-2 p-4 hover:bg-gray-50 transition-colors sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{job.homeownerName}</p>
                  {statusBadge(job.status)}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{workers}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                <Clock className="h-3 w-3" />{formatTime(job.scheduledTime)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
