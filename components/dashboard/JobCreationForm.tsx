'use client';

import { useState } from 'react';
import { PlusCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

export function JobCreationForm() {
  const { refresh } = useDashboard();
  const [open, setOpen] = useState(true);
  const [homeownerName, setHomeownerName] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleWorker = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (homeownerName.trim().length < 2) errs.homeownerName = 'Name is required';
    if (address.trim().length < 5) errs.address = 'Address is required';
    if (!scheduledTime) errs.scheduledTime = 'Time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeownerName, address, scheduledTime, assignedWorkerIds: selected }),
      });
      setHomeownerName('');
      setAddress('');
      setScheduledTime('');
      setSelected([]);
      setErrors({});
      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="cursor-pointer select-none pb-3" onClick={() => setOpen((o) => !o)}>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <PlusCircle className="h-4 w-4 text-indigo-500" />
          Create New Job
          <span className="ml-auto text-gray-300">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </CardTitle>
      </CardHeader>

      {open && (
        <>
          <Separator className="bg-gray-100" />
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Homeowner Name</Label>
                  <input
                    value={homeownerName}
                    onChange={(e) => setHomeownerName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.homeownerName && <p className="text-xs text-red-500">{errors.homeownerName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Scheduled Time</Label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.scheduledTime && <p className="text-xs text-red-500">{errors.scheduledTime}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Service Address</Label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 412 Coral Reef Dr, Miami FL"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
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
                          selected.includes(w.id)
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
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-500">
                  {submitting ? 'Creating…' : 'Create Job'}
                </Button>
                {success && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />Job created!
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </>
      )}
    </Card>
  );
}
