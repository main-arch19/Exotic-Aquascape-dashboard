'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, PlusCircle, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useDashboard } from '@/context/DashboardContext';

export function TimesheetView() {
  const { timesheets, workerStatuses, isLoading, refresh } = useDashboard();

  const [showForm, setShowForm] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [punchIn, setPunchIn] = useState('');
  const [punchOut, setPunchOut] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const sorted = [...timesheets].sort(
    (a, b) => new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime()
  );

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!workerId) errs.workerId = 'Worker is required';
    if (!punchIn) errs.punchIn = 'Punch in time is required';
    if (punchOut && punchIn && new Date(punchOut) <= new Date(punchIn)) {
      errs.punchOut = 'Punch out must be after punch in';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/timesheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          punchIn: new Date(punchIn).toISOString(),
          punchOut: punchOut ? new Date(punchOut).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErrors({ workerId: data.error ?? 'Failed to add entry' });
        return;
      }
      setWorkerId('');
      setPunchIn('');
      setPunchOut('');
      setFormErrors({});
      setShowForm(false);
      setCreateSuccess(true);
      await refresh();
      setTimeout(() => setCreateSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Clock className="h-4 w-4 text-indigo-500" />
          Timesheets
          <div className="ml-auto flex items-center gap-2">
            {createSuccess && (
              <span className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />Entry added!
              </span>
            )}
            <button
              onClick={() => setShowForm((o) => !o)}
              className="flex min-h-10 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-indigo-700 transition-colors hover:bg-indigo-100 sm:min-h-0"
            >
              {showForm ? <><ChevronUp className="h-3.5 w-3.5" />Cancel</> : <><PlusCircle className="h-3.5 w-3.5" />Add Entry</>}
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      {showForm && (
        <>
          <Separator className="bg-gray-100" />
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Worker</Label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">Select worker…</option>
                    {workerStatuses.map((w) => (
                      <option key={w.workerId} value={w.workerId}>{w.workerName}</option>
                    ))}
                  </select>
                  {formErrors.workerId && <p className="text-xs text-red-500">{formErrors.workerId}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Punch In</Label>
                  <input
                    type="datetime-local"
                    value={punchIn}
                    onChange={(e) => setPunchIn(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.punchIn && <p className="text-xs text-red-500">{formErrors.punchIn}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Punch Out (optional)</Label>
                  <input
                    type="datetime-local"
                    value={punchOut}
                    onChange={(e) => setPunchOut(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.punchOut && <p className="text-xs text-red-500">{formErrors.punchOut}</p>}
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-500">
                {submitting ? 'Adding…' : 'Add Entry'}
              </Button>
            </form>
          </CardContent>
        </>
      )}

      <Separator className="bg-gray-100" />
      <CardContent className="p-0">
        {/* Phones: one card per record. Five columns can't be read on a 320px
            screen without sideways scrolling, which is awkward one-handed in
            the field. The table returns at sm and up. */}
        <div className="space-y-2 p-3 sm:hidden">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3">
                  <Skeleton className="h-4 w-2/3 bg-gray-200" />
                  <Skeleton className="mt-2 h-3 w-full bg-gray-200" />
                </div>
              ))
            : sorted.map((record) => (
                <div key={record.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-gray-800">
                      {record.workerName}
                    </p>
                    {record.punchOut
                      ? <Badge className="shrink-0 border-0 bg-gray-100 text-gray-500">Complete</Badge>
                      : <Badge className="shrink-0 border-0 bg-emerald-100 text-emerald-700">Active</Badge>}
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-gray-400">In</dt>
                      <dd className="mt-0.5 text-gray-600">{format(new Date(record.punchIn), 'h:mm a')}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Out</dt>
                      <dd className="mt-0.5 text-gray-600">
                        {record.punchOut ? format(new Date(record.punchOut), 'h:mm a') : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Hours</dt>
                      <dd className="mt-0.5 font-medium text-gray-800">
                        {record.totalHours != null ? `${record.totalHours.toFixed(2)}` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
        </div>

        {/* Table's own wrapper div takes no className, so gate it from outside. */}
        <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-xs text-gray-400">Worker</TableHead>
              <TableHead className="text-xs text-gray-400">Punch In</TableHead>
              <TableHead className="text-xs text-gray-400">Punch Out</TableHead>
              <TableHead className="text-xs text-gray-400">Total Hours</TableHead>
              <TableHead className="text-xs text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-100">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-gray-200" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map((record) => (
                  <TableRow key={record.id} className="border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-800">{record.workerName}</TableCell>
                    <TableCell className="text-gray-500">{format(new Date(record.punchIn), 'h:mm a')}</TableCell>
                    <TableCell className="text-gray-500">{record.punchOut ? format(new Date(record.punchOut), 'h:mm a') : '—'}</TableCell>
                    <TableCell className="text-gray-700">{record.totalHours != null ? `${record.totalHours.toFixed(2)} hrs` : '—'}</TableCell>
                    <TableCell>
                      {record.punchOut
                        ? <Badge className="border-0 bg-gray-100 text-gray-500">Complete</Badge>
                        : <Badge className="border-0 bg-emerald-100 text-emerald-700">Active</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
