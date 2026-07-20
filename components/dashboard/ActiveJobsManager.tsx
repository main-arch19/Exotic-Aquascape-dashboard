'use client';

import { useState } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  Loader2,
  Home,
  LogOut,
  AlertTriangle,
  X,
  UserPlus,
  CheckCircle2,
  BellOff,
} from 'lucide-react';
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

/**
 * Dispatcher view of active jobs: assign agents, and record arrive/leave/delay
 * on an agent's behalf when their phone has died.
 *
 * Job CREATION lives in QuickJobBar (app/page.tsx), not here. This component
 * used to carry a second, buggier creation form that was unreachable behind
 * `hideAdd` but still live in the tree — it has been removed rather than gated.
 *
 * Every action names the agent explicitly. It previously sent
 * `assignedWorkerIds[0] ?? 'w1'`, which attributed a manager's action to
 * whichever assignee happened to sort first — often the wrong person, and after
 * the manager_id split, often a manager rather than an agent.
 */
export function ActiveJobsManager() {
  const { jobs, users, refresh } = useDashboard();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [delayInput, setDelayInput] = useState<Record<string, string>>({});
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  const agents = users.filter((u) => u.role === 'worker' && u.approved && !u.revoked);
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const setFeedbackTimed = (jobId: string, msg: string) => {
    setFeedback((f) => ({ ...f, [jobId]: msg }));
    setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[jobId]; return n; }), 4000);
  };

  const call = async (
    url: string,
    body: Record<string, unknown>,
    key: string,
    jobId: string,
    okMsg: string
  ) => {
    setActionLoading(key);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackTimed(jobId, data.error ?? 'Error');
        return null;
      }
      setFeedbackTimed(jobId, okMsg);
      await refresh();
      return data;
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (jobId: string, workerId: string) => {
    const data = await call(
      '/api/jobs/assign',
      { jobId, workerId },
      `${jobId}-assign`,
      jobId,
      'Assigned'
    );
    setAssignOpen(null);
    // The agent is only reachable by push if they've enabled notifications.
    // Say so, so the dispatcher knows to phone them instead of assuming.
    if (data && data.pushDelivered === false) {
      setFeedbackTimed(jobId, 'Assigned — push not delivered (notifications are off on their device)');
    }
  };

  const handleUnassign = async (jobId: string, workerId: string, accepted: boolean) => {
    if (accepted) {
      const name = nameById.get(workerId) ?? 'This agent';
      if (
        !window.confirm(
          `${name} has accepted and may be en route. Unassigning will end their location sharing.`
        )
      ) {
        return;
      }
    }
    await call(
      '/api/jobs/unassign',
      { jobId, workerId },
      `${jobId}-unassign-${workerId}`,
      jobId,
      'Removed from job'
    );
  };

  const handleDelaySubmit = async (jobId: string, workerId: string) => {
    const reason = delayInput[jobId]?.trim();
    if (!reason) return;
    const ok = await call(
      '/api/delay',
      { workerId, reason },
      `${jobId}-delay`,
      jobId,
      'Delay reported'
    );
    if (ok) {
      setDelayInput((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    }
  };

  const activeJobs = jobs.filter((j) => j.status !== 'completed');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          Active Jobs Today
          <span className="text-xs font-normal normal-case tracking-normal text-gray-400">
            {activeJobs.length} jobs
          </span>
        </CardTitle>
      </CardHeader>

      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {activeJobs.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">
            No active jobs — create one with the New Job bar above
          </p>
        )}
        {activeJobs.map((job) => {
          const msg = feedback[job.id];
          const delayOpen = job.id in delayInput;
          const unassigned = agents.filter(
            (a) => !job.assignments.some((as) => as.workerId === a.id)
          );

          return (
            <div key={job.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-gray-50">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{job.homeownerName}</p>
                    {statusBadge(job.status)}
                    {msg && <span className="text-xs font-medium text-indigo-600">{msg}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(job.scheduledTime), 'h:mm a')}</span>
                  </div>
                </div>
              </div>

              {/* Assigned agents, each with its acceptance state */}
              <div className="flex flex-wrap items-center gap-1.5">
                {job.assignments.length === 0 && (
                  <span className="text-xs text-gray-400">No agent assigned yet</span>
                )}
                {job.assignments.map((a) => {
                  const accepted = Boolean(a.acceptedAt);
                  return (
                    <span
                      key={a.workerId}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        accepted
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {accepted ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 shrink-0" />
                      )}
                      {nameById.get(a.workerId) ?? a.workerId}
                      <span className="opacity-70">
                        {accepted
                          ? `accepted ${format(new Date(a.acceptedAt!), 'h:mm a')}`
                          : 'awaiting acceptance'}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${nameById.get(a.workerId) ?? 'agent'} from this job`}
                        disabled={!!actionLoading}
                        onClick={() => handleUnassign(job.id, a.workerId, accepted)}
                        className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}

                {unassigned.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => setAssignOpen(assignOpen === job.id ? null : job.id)}
                      className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-40"
                    >
                      {actionLoading === `${job.id}-assign` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Assign
                    </button>
                    {assignOpen === job.id && (
                      <div className="absolute left-0 top-full z-10 mt-1 min-w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {unassigned.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleAssign(job.id, a.id)}
                            className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            {a.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* One action row per ACCEPTED agent. A manager can record these on
                  an agent's behalf; the server accepts an explicit workerId from
                  a dispatcher but ignores it from an agent. */}
              {job.assignments
                .filter((a) => a.acceptedAt)
                .map((a) => (
                  <div
                    key={`actions-${a.workerId}`}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2"
                  >
                    <span className="text-xs font-medium text-gray-500">
                      {nameById.get(a.workerId) ?? a.workerId}:
                    </span>
                    <button
                      disabled={!!actionLoading}
                      onClick={() =>
                        call(
                          '/api/jobs/arrive',
                          { jobId: job.id, workerId: a.workerId, location: job.address },
                          `${job.id}-arrive-${a.workerId}`,
                          job.id,
                          'Marked arrived'
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading === `${job.id}-arrive-${a.workerId}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Home className="h-3.5 w-3.5" />
                      )}
                      Arrive
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() =>
                        call(
                          '/api/jobs/leave',
                          { jobId: job.id, workerId: a.workerId },
                          `${job.id}-leave-${a.workerId}`,
                          job.id,
                          'Marked complete'
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading === `${job.id}-leave-${a.workerId}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Complete
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() =>
                        delayOpen
                          ? setDelayInput((prev) => {
                              const next = { ...prev };
                              delete next[job.id];
                              return next;
                            })
                          : setDelayInput((prev) => ({ ...prev, [job.id]: '' }))
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Delayed
                    </button>

                    {delayOpen && (
                      <div className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <input
                          autoFocus
                          placeholder="Reason for delay…"
                          value={delayInput[job.id]}
                          onChange={(e) =>
                            setDelayInput((d) => ({ ...d, [job.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleDelaySubmit(job.id, a.workerId);
                          }}
                          className="min-w-0 flex-1 bg-transparent text-xs text-amber-900 outline-none placeholder:text-amber-400"
                        />
                        <button
                          disabled={
                            !delayInput[job.id]?.trim() ||
                            actionLoading === `${job.id}-delay`
                          }
                          onClick={() => handleDelaySubmit(job.id, a.workerId)}
                          className="shrink-0 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoading === `${job.id}-delay` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Submit'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              {job.assignments.length > 0 &&
                job.assignments.every((a) => !a.acceptedAt) && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-400">
                    <BellOff className="h-3 w-3" />
                    Waiting for the agent to accept — location sharing starts then.
                  </p>
                )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
