'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Wrench, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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

export function ToolInventoryTable() {
  const { tools, isLoading, refresh } = useDashboard();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const setFeedbackTimed = (toolId: string, msg: string) => {
    setFeedback((f) => ({ ...f, [toolId]: msg }));
    setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[toolId]; return n; }), 2500);
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
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="p-0">
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {msg && <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">{msg}</span>}
                          {isCheckedOut ? (
                            <button
                              disabled={busy}
                              onClick={() => handleReturn(tool.id, tool.checkedOutById ?? '')}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Return
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={selectedWorker[tool.id] ?? ''}
                                onChange={(e) => setSelectedWorker((s) => ({ ...s, [tool.id]: e.target.value }))}
                                className="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-6 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              >
                                <option value="">Worker…</option>
                                {WORKERS.map((w) => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                              <button
                                disabled={busy || !selectedWorker[tool.id]}
                                onClick={() => handleCheckout(tool.id)}
                                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Check Out
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
