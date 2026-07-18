'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Wrench, Loader2, PlusCircle, ChevronUp, CheckCircle2 } from 'lucide-react';
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
import type { Tool } from '@/lib/types';

export function ToolInventoryTable({ hideAdd = false }: { hideAdd?: boolean } = {}) {
  const { tools, isLoading, users, refresh } = useDashboard();
  const WORKERS = users;
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  // Add tool form state
  const [showForm, setShowForm] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolCategory, setToolCategory] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  /* Shared by the mobile card list and the desktop table so the checkout
     wiring exists in one place. A plain function, not a component, so React
     doesn't remount the <select> and drop focus on every render. */
  const renderToolActions = (tool: Tool, opts?: { full?: boolean }) => {
    const isCheckedOut = tool.status === 'checked_out';
    const busy = loadingId === tool.id;
    const msg = feedback[tool.id];

    return (
      <div className={`flex items-center gap-2 ${opts?.full ? 'w-full' : ''}`}>
        {msg && <span className="whitespace-nowrap text-xs font-medium text-indigo-600">{msg}</span>}
        {isCheckedOut ? (
          <button
            disabled={busy}
            onClick={() => handleReturn(tool.id, tool.checkedOutById ?? '')}
            className={`flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 ${opts?.full ? 'w-full' : ''}`}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Return
          </button>
        ) : (
          <div className={`flex items-center gap-1.5 ${opts?.full ? 'w-full' : ''}`}>
            <select
              value={selectedWorker[tool.id] ?? ''}
              onChange={(e) => setSelectedWorker((s) => ({ ...s, [tool.id]: e.target.value }))}
              className={`rounded-md border border-gray-200 bg-white py-1.5 pl-2 pr-6 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${opts?.full ? 'min-w-0 flex-1' : ''}`}
            >
              <option value="">Worker…</option>
              {WORKERS.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button
              disabled={busy || !selectedWorker[tool.id]}
              onClick={() => handleCheckout(tool.id)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Check Out
            </button>
          </div>
        )}
      </div>
    );
  };

  const setFeedbackTimed = (toolId: string, msg: string) => {
    setFeedback((f) => ({ ...f, [toolId]: msg }));
    setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[toolId]; return n; }), 2500);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (toolName.trim().length < 2) errs.toolName = 'Tool name is required';
    if (toolCategory.trim().length < 2) errs.toolCategory = 'Category is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await fetch('/api/tools/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, category: toolCategory }),
      });
      setToolName('');
      setToolCategory('');
      setFormErrors({});
      setShowForm(false);
      setCreateSuccess(true);
      await refresh();
      setTimeout(() => setCreateSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (toolId: string, workerId: string) => {
    setLoadingId(toolId);
    try {
      const res = await fetch('/api/tools/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, workerId }),
      });
      const data = await res.json();
      setFeedbackTimed(toolId, res.ok ? 'Returned!' : (data.error ?? 'Error'));
      if (res.ok) await refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const handleCheckout = async (toolId: string) => {
    const workerId = selectedWorker[toolId];
    if (!workerId) { setFeedbackTimed(toolId, 'Select a worker first'); return; }
    setLoadingId(toolId);
    try {
      const res = await fetch('/api/tools/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, workerId }),
      });
      const data = await res.json();
      setFeedbackTimed(toolId, res.ok ? 'Checked out!' : (data.error ?? 'Error'));
      if (res.ok) {
        setSelectedWorker((s) => { const n = { ...s }; delete n[toolId]; return n; });
        await refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Wrench className="h-4 w-4 text-sky-500" />
          Tool Inventory
          {!hideAdd && (
            <div className="ml-auto flex items-center gap-2">
              {createSuccess && (
                <span className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />Tool added!
                </span>
              )}
              <button
                onClick={() => setShowForm((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                {showForm ? <><ChevronUp className="h-3.5 w-3.5" />Cancel</> : <><PlusCircle className="h-3.5 w-3.5" />Add Tool</>}
              </button>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      {showForm && (
        <>
          <Separator className="bg-gray-100" />
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Tool Name</Label>
                  <input
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. Pressure Washer"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.toolName && <p className="text-xs text-red-500">{formErrors.toolName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Category</Label>
                  <input
                    value={toolCategory}
                    onChange={(e) => setToolCategory(e.target.value)}
                    placeholder="e.g. Cleaning Equipment"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {formErrors.toolCategory && <p className="text-xs text-red-500">{formErrors.toolCategory}</p>}
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-500">
                {submitting ? 'Adding…' : 'Add Tool'}
              </Button>
            </form>
          </CardContent>
        </>
      )}

      <Separator className="bg-gray-100" />
      <CardContent className="p-0">
        {/* Phones: card per tool. Six columns including a select and a button
            cannot fit a 320px screen; the table returns at sm and up. */}
        <div className="space-y-2 p-3 sm:hidden">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3">
                  <Skeleton className="h-4 w-2/3 bg-gray-200" />
                  <Skeleton className="mt-2 h-3 w-full bg-gray-200" />
                </div>
              ))
            : tools.map((tool) => {
                const isCheckedOut = tool.status === 'checked_out';
                return (
                  <div key={tool.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{tool.name}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{tool.category}</p>
                      </div>
                      {isCheckedOut
                        ? <Badge className="shrink-0 border-0 bg-amber-100 text-amber-700">Checked Out</Badge>
                        : <Badge className="shrink-0 border-0 bg-emerald-100 text-emerald-700">Available</Badge>}
                    </div>

                    {isCheckedOut && (
                      <p className="mt-2 truncate text-xs text-gray-500">
                        Held by {tool.checkedOutByName ?? '—'}
                        {tool.checkedOutAt ? ` · since ${format(new Date(tool.checkedOutAt), 'h:mm a')}` : ''}
                      </p>
                    )}

                    <div className="mt-3">{renderToolActions(tool, { full: true })}</div>
                  </div>
                );
              })}
        </div>

        {/* Table's own wrapper div takes no className, so gate it from outside. */}
        <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-xs text-gray-400">Tool</TableHead>
              <TableHead className="text-xs text-gray-400">Category</TableHead>
              <TableHead className="text-xs text-gray-400">Status</TableHead>
              <TableHead className="text-xs text-gray-400">Held By</TableHead>
              <TableHead className="text-xs text-gray-400">Since</TableHead>
              <TableHead className="text-xs text-gray-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-gray-200" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : tools.map((tool) => {
                  const isCheckedOut = tool.status === 'checked_out';
                  const busy = loadingId === tool.id;
                  const msg = feedback[tool.id];

                  return (
                    <TableRow key={tool.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-800">{tool.name}</TableCell>
                      <TableCell className="text-gray-500">{tool.category}</TableCell>
                      <TableCell>
                        {isCheckedOut
                          ? <Badge className="border-0 bg-amber-100 text-amber-700">Checked Out</Badge>
                          : <Badge className="border-0 bg-emerald-100 text-emerald-700">Available</Badge>}
                      </TableCell>
                      <TableCell className="text-gray-500">{tool.checkedOutByName ?? '—'}</TableCell>
                      <TableCell className="text-gray-400">
                        {tool.checkedOutAt ? format(new Date(tool.checkedOutAt), 'h:mm a') : '—'}
                      </TableCell>
                      <TableCell>{renderToolActions(tool)}</TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
