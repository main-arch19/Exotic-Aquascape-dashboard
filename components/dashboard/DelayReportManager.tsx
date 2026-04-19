'use client';

import { useState } from 'react';
import { AlertTriangle, PlusCircle, ChevronUp, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/context/DashboardContext';

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

export function DelayReportManager() {
  const { events, refresh } = useDashboard();
  const [showForm, setShowForm] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const delayEvents = events
    .filter((e) => e.type === 'delayed')
    .slice(0, 15);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, reason }),
      });
      if (res.ok) {
        setWorkerId('');
        setReason('');
        setShowForm(false);
        setSuccess(true);
        await refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Delays Reported
          <span className="text-xs font-normal normal-case tracking-normal text-amber-500">{delayEvents.length} reports</span>
          <div className="ml-auto flex items-center gap-2">
            {success && (
              <span className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />Reported!
              </span>
            )}
            <button
              onClick={() => setShowForm((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-amber-700 transition-colors hover:bg-amber-100"
            >
              {showForm
                ? <><ChevronUp className="h-3.5 w-3.5" />Cancel</>
                : <><PlusCircle className="h-3.5 w-3.5" />New Report</>}
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Inline create form */}
      {showForm && (
        <>
          <Separator className="bg-gray-100" />
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Worker</Label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">Select worker…</option>
                    {WORKERS.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Reason for Delay</Label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the delay…"
                    rows={2}
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting || !workerId || !reason.trim()}
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Submitting…</> : 'Submit Report'}
              </Button>
            </form>
          </CardContent>
        </>
      )}

      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {delayEvents.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No delays reported today</p>
        )}
        {delayEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-3 p-4 hover:bg-amber-50/30 transition-colors">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{event.workerName}</p>
                <Badge className="border-0 bg-amber-100 text-amber-700 text-xs">Delayed</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{event.message.replace(/^.*?reported delay:\s*/i, '')}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
