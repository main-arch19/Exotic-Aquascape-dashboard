'use client';

import { useState } from 'react';
import { Droplets, PlusCircle, MapPin, Clock, User, Users, Loader2, CheckCircle2, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { CEOView } from '@/components/dashboard/CEOView';
import { ManagerView } from '@/components/dashboard/ManagerView';
import { TimesheetView } from '@/components/dashboard/TimesheetView';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { RevenueDashboard } from '@/components/dashboard/RevenueDashboard';

type Tab = 'ceo' | 'manager' | 'timesheet';

const MANAGERS = [
  { id: 'w6', name: 'Sofia Morales' },
  { id: 'w4', name: 'Aisha Thompson' },
];

const WORKERS = [
  { id: 'w1', name: 'Marcus Rivera' },
  { id: 'w2', name: 'Priya Nair' },
  { id: 'w3', name: 'Devon Chang' },
  { id: 'w5', name: "Liam O'Brien" },
  { id: 'w7', name: 'Trent Wallace' },
  { id: 'w8', name: 'Keisha Fontaine' },
];

function QuickJobForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { refresh } = useDashboard();
  const [homeowner, setHomeowner] = useState('');
  const [address, setAddress] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [managerId, setManagerId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (homeowner.trim().length < 2) e.homeowner = 'Required';
    if (address.trim().length < 5) e.address = 'Required';
    if (!arrivalTime) e.arrivalTime = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const assignedWorkerIds = [managerId, workerId].filter(Boolean);
      await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeownerName: homeowner, address, scheduledTime: arrivalTime, assignedWorkerIds }),
      });
      await refresh();
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 pb-4 pt-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-1 space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <User className="h-3 w-3" /> Homeowner
          </label>
          <input
            value={homeowner}
            onChange={(e) => setHomeowner(e.target.value)}
            placeholder="Jane Smith"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${errors.homeowner ? 'border-red-300' : 'border-gray-200'}`}
          />
          {errors.homeowner && <p className="text-xs text-red-500">{errors.homeowner}</p>}
        </div>

        <div className="xl:col-span-2 space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <MapPin className="h-3 w-3" /> Service Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="412 Coral Reef Dr, Miami FL"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${errors.address ? 'border-red-300' : 'border-gray-200'}`}
          />
          {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
        </div>

        <div className="xl:col-span-1 space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Clock className="h-3 w-3" /> Arrival Time
          </label>
          <input
            type="datetime-local"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${errors.arrivalTime ? 'border-red-300' : 'border-gray-200'}`}
          />
          {errors.arrivalTime && <p className="text-xs text-red-500">{errors.arrivalTime}</p>}
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <User className="h-3 w-3" /> Manager
          </label>
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Unassigned</option>
            {MANAGERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Users className="h-3 w-3" /> Employee
          </label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Unassigned</option>
            {WORKERS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          {submitting ? 'Creating…' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}

function QuickJobBar() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <PlusCircle className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-700">Create New Job</span>
        {success && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 ml-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Job created!
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && <QuickJobForm onClose={() => setOpen(false)} onSuccess={handleSuccess} />}
    </div>
  );
}

function RevenueBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <BarChart2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-700">Revenue Calculation Dashboard</span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100">
          <RevenueDashboard />
        </div>
      )}
    </div>
  );
}

function DashboardInner() {
  const [activeTab, setActiveTab] = useState<Tab>('ceo');

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-gray-900">Exotic Aquascape</p>
              <p className="mt-0.5 text-xs leading-none text-gray-400">Field Operations</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">Field Operations Dashboard</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('ceo')}
              className={`rounded-md px-5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'ceo'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              CEO View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manager')}
              className={`rounded-md px-5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'manager'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Manager View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timesheet')}
              className={`rounded-md px-5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'timesheet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Timesheets
            </button>
          </div>
        </div>

        <QuickJobBar />
        {activeTab === 'ceo' && <RevenueBar />}

        {activeTab === 'ceo' && <CEOView />}
        {activeTab === 'manager' && <ManagerView />}
        {activeTab === 'timesheet' && <TimesheetView />}
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        Exotic Aquascape Field Operations
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
