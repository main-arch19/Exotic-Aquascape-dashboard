'use client';

import { useState } from 'react';
import { Briefcase, MapPin, Clock, Users, Loader2, PlusCircle, ChevronUp, CheckCircle2, Home, LogOut, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/context/DashboardContext';
import { JobStatus } from '@/lib/types';

const WORKERS = [
  { id: 'w1', name: 'Marcus Rivera' },
  { id: 'w2', name: 'Priya Nair' },
  { id: 'w3', name: 'Devon Chang' },
  { id: 'w4', name: 'Aisha Thompson' },
  { id: 'w5', name: "Liam O'Brien" },
  { id: 'w6', name: 'Sofia Morales' },
  { id: 'w7', name: 'Trent Wallace' },
  { id: 'w8', name: 'Keisha Fontaine' },
];

function statusBadge(status: JobStatus) {
  switch (status) {
    case 'in_progress': return <Badge className="border-0 bg-emerald-100 text-emerald-700">In Progress</Badge>;
    case 'delayed':     return <Badge className="border-0 bg-amber-100 text-amber-700">Delayed</Badge>;
    case 'scheduled':   return <Badge className="border-0 bg-indigo-100 text-indigo-700">Scheduled</Badge>;
    case 'completed':   return <Badge className="border-0 bg-gray-100 text-gray-500">Completed</Badge>;
  }
}

export function ActiveJobsManager() {
  const { jobs, workerStatuses, refresh } = useDashboard();

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [homeownerName, setHomeownerName] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Job action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [delayInput, setDelayInput] = useState<Record<string, string>>({});

  const setFeedbackTimed = (jobId: string, msg: string) => {
    setFeedback((f) => ({ ...f, [jobId]: msg }));
    setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[jobId]; return n; }), 3000);
  };

  const toggleWorker = (id: string) =>
    setSelectedWorkers((prev) => prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (homeownerName.trim().length < 2) errs.homeownerName = 'Name is required';
    if (address.trim().length < 5) errs.address = 'Address is required';
    if (!scheduledTime) errs.scheduledTime = 'Time is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeownerName, address, scheduledTime, assignedWorkerIds: selectedWorkers }),
      });
      setHomeownerName('');
      setAddress('');
      setScheduledTime('');
      setSelectedWorkers([]);
      setFormErrors({});
      setShowForm(false);
      setCreateSuccess(true);
      await refresh();
      setTimeout(() => setCreateSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrive = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setActionLoading(`${jobId}-arrive`);
    try {
      const res = await fetch('/api/jobs/arrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, workerId: job.assignedWorkerIds[0] ?? 'w1', location: job.address }),
      });
      const data = await res.json();
      setFeedbackTimed(jobId, res.ok ? "We're on property!" : (data.error ?? 'Error'));
      if (res.ok) await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setActionLoading(`${jobId}-leave`);
    try {
      const res = await fetch('/api/jobs/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, workerId: job.assignedWorkerIds[0] ?? 'w1' }),
      });
      const data = await res.json();
      setFeedbackTimed(jobId, res.ok ? 'Leaving property!' : (data.error ?? 'Error'));
      if (res.ok) await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const openDelayInput = (jobId: string) => {
    setDelayInput((prev) => ({ ...prev, [jobId]: '' }));
  };

  const closeDelayInput = (jobId: string) => {
    setDelayInput((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  };

  const handleDelaySubmit = async (jobId: string) => {
    const reason = delayInput[jobId]?.trim();
    if (!reason) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setActionLoading(`${jobId}-delay`);
    try {
      const res = await fetch('/api/delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: job.assignedWorkerIds[0] ?? 'w1', reason }),
      });
      const data = await res.json();
      setFeedbackTimed(jobId, res.ok ? 'Delay reported!' : (data.error ?? 'Error'));
      if (res.ok) {
        closeDelayInput(jobId);
        await refresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const activeJobs = jobs.filter((j) => j.status !== 'completed');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          Active Jobs Today
          <span className="text-xs font-normal normal-case tracking-normal text-gray-400">{activeJobs.length} jobs</span>
          <div className="ml-auto flex items-center gap-2">
            {createSuccess && (
              <span className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />Job created!
              </span>
            )}
            <button
              onClick={() => setShowForm((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              {showForm ? <><ChevronUp className="h-3.5 w-3.5" />Cancel</> : <><PlusCircle className="h-3.5 w-3.5" />New Job</>}
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      {showForm && (
        <>
          <Separator className="bg-gray-100" />
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Homeowner Name</Label>
                  <input
                    value={homeownerName}
                    onChange={(e) => setHomeownerName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.homeownerName && <p className="text-xs text-red-500">{formErrors.homeownerName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Scheduled Time</Label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.scheduledTime && <p className="text-xs text-red-500">{formErrors.scheduledTime}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Service Address</Label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 412 Coral Reef Dr, Miami FL"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.address && <p className="text-xs text-red-500">{formErrors.address}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Assign Workers</Label>
                  <div className="flex flex-wrap gap-2">
                    {WORKERS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWorker(w.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selectedWorkers.includes(w.id)
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-500">
                {submitting ? 'Creating…' : 'Create Job'}
              </Button>
            </form>
          </CardContent>
        </>
      )}

      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {activeJobs.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No active jobs — create one above</p>
        )}
        {activeJobs.map((job) => {
          const isDone = job.status === 'completed';
          const msg = feedback[job.id];
          const delayOpen = job.id in delayInput;
          const assignedNames = job.assignedWorkerIds
            .map((id) => workerStatuses.find((w) => w.workerId === id)?.workerName ?? id)
            .join(', ');

          return (
            <div key={job.id} className="flex flex-col gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{job.homeownerName}</p>
                    {statusBadge(job.status)}
                    {msg && <span className="text-xs font-medium text-indigo-600">{msg}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(job.scheduledTime), 'h:mm a')}</span>
                    {assignedNames && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignedNames}</span>}
                  </div>
                </div>

                {!isDone && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleArrive(job.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading === `${job.id}-arrive` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Home className="h-3.5 w-3.5" />}
                      We&apos;re Here
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleLeave(job.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading === `${job.id}-leave` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                      Leaving
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() => delayOpen ? closeDelayInput(job.id) : openDelayInput(job.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Delayed
                    </button>
                  </div>
                )}
              </div>

              {delayOpen && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <input
                    autoFocus
                    placeholder="Reason for delay…"
                    value={delayInput[job.id]}
                    onChange={(e) => setDelayInput((d) => ({ ...d, [job.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDelaySubmit(job.id); }}
                    className="min-w-0 flex-1 bg-transparent text-xs text-amber-900 placeholder:text-amber-400 outline-none"
                  />
                  <button
                    disabled={!delayInput[job.id]?.trim() || actionLoading === `${job.id}-delay`}
                    onClick={() => handleDelaySubmit(job.id)}
                    className="shrink-0 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading === `${job.id}-delay` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit'}
                  </button>
                  <button onClick={() => closeDelayInput(job.id)} className="shrink-0 text-amber-400 hover:text-amber-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
