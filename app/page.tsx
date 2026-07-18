'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, MapPin, Clock, User, Users, Loader2, CheckCircle2, BarChart2, CalendarClock, Wrench, Receipt, LogOut } from 'lucide-react';
import { CEOView } from '@/components/dashboard/CEOView';
import { ManagerView } from '@/components/dashboard/ManagerView';
import { AgentView } from '@/components/dashboard/AgentView';
import { TimesheetView } from '@/components/dashboard/TimesheetView';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { RevenueDashboard } from '@/components/dashboard/RevenueDashboard';
import { JobScheduler } from '@/components/dashboard/JobScheduler';
import { InvoiceDashboard } from '@/components/dashboard/InvoiceDashboard';
import { ToolInventoryHealthSection } from '@/components/dashboard/ToolInventoryHealthSection';
import { Section } from '@/components/ui/section';
import { UserApprovalBar } from '@/components/dashboard/UserApprovalBar';
import type { CurrentUser } from '@/lib/types';

type Tab = 'ceo' | 'manager' | 'agent' | 'timesheet' | 'scheduler';

const TAB_LABELS: Record<Tab, string> = {
  ceo: 'CEO View',
  manager: 'Manager View',
  agent: 'Agent View',
  timesheet: 'Timesheets',
  scheduler: 'Job Scheduler',
};

// Which tabs each role may see. Agent (worker) and manager get only their own
// view; the CEO sees everything plus the approval panel.
function allowedTabsFor(role: CurrentUser['role']): Tab[] {
  if (role === 'ceo') return ['ceo', 'manager', 'agent', 'timesheet', 'scheduler'];
  if (role === 'manager') return ['manager'];
  return ['agent'];
}

function PendingApproval({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <Clock className="h-6 w-6 text-amber-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Waiting for approval</h2>
      <p className="mt-2 text-sm text-gray-500">
        Thanks, {name}. Your account is pending — the CEO will review your access and
        assign your role shortly. Check back soon.
      </p>
    </div>
  );
}

function QuickJobForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { users, refresh } = useDashboard();
  const MANAGERS = users.filter((u) => u.role === 'manager');
  const WORKERS = users.filter((u) => u.role === 'worker');
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
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="mb-6">
      <Section
        title="Create New Job"
        icon={<PlusCircle className="h-4 w-4" />}
        collapsible
        defaultOpen={false}
        accent="primary"
        hover
      >
        <div className="space-y-4">
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Job created successfully!
            </div>
          )}
          <QuickJobForm onClose={() => {}} onSuccess={handleSuccess} />
        </div>
      </Section>
    </div>
  );
}

function RevenueBar() {
  return (
    <div className="mb-6">
      <Section
        title="Revenue Calculation Dashboard"
        icon={<BarChart2 className="h-4 w-4" />}
        collapsible
        defaultOpen={false}
        accent="primary"
        hover
      >
        <RevenueDashboard />
      </Section>
    </div>
  );
}

function ToolInventoryBar() {
  return (
    <div className="mb-6">
      <Section
        title="Tool Inventory Health"
        icon={<Wrench className="h-4 w-4" />}
        collapsible
        defaultOpen={false}
        accent="emerald"
        hover
      >
        <ToolInventoryHealthSection />
      </Section>
    </div>
  );
}

function InvoiceBar() {
  return (
    <div className="mb-6">
      <Section
        title="Invoice Dashboard"
        icon={<Receipt className="h-4 w-4" />}
        collapsible
        defaultOpen={false}
        accent="primary"
        hover
      >
        <InvoiceDashboard />
      </Section>
    </div>
  );
}

function DashboardInner() {
  const [activeTab, setActiveTab] = useState<Tab>('ceo');
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CurrentUser | null) => setMe(data))
      .catch(() => {})
      .finally(() => setMeLoading(false));
  }, []);

  const allowedTabs = me ? allowedTabsFor(me.role) : [];

  // When the current user resolves, snap to a tab their role can actually see.
  useEffect(() => {
    if (!me) return;
    const allowed = allowedTabsFor(me.role);
    setActiveTab((cur) => (allowed.includes(cur) ? cur : allowed[0]));
  }, [me]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="Exotic Aquascape logo"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div>
              <p className="text-sm font-bold leading-none text-gray-900">Exotic Aquascape</p>
              <p className="mt-0.5 text-xs leading-none text-gray-400">Field Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <div className="text-right">
                <p className="text-xs font-medium leading-none text-gray-700">{me.name}</p>
                <p className="mt-0.5 text-[10px] uppercase leading-none tracking-wide text-gray-400">{me.approved ? me.role : 'pending'}</p>
              </div>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {meLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : me && !me.approved ? (
          <PendingApproval name={me.name} />
        ) : (
          <>
            <div className="mb-6">
              <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-full sm:w-fit">
                {allowedTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-5 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'scheduler' && <CalendarClock className="h-3.5 w-3.5" />}
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>

            {me?.role === 'ceo' && <UserApprovalBar />}
            {me?.role !== 'worker' && <QuickJobBar />}

            <div className="transition-opacity duration-300">
              {(activeTab === 'ceo' || activeTab === 'scheduler') && <RevenueBar />}
              {activeTab === 'ceo' && <InvoiceBar />}
              {activeTab === 'ceo' && <ToolInventoryBar />}
            </div>

            <div key={activeTab} className="transition-opacity duration-300 animate-in fade-in-0">
              {activeTab === 'ceo' && <CEOView />}
              {activeTab === 'manager' && <ManagerView />}
              {activeTab === 'agent' && <AgentView />}
              {activeTab === 'timesheet' && <TimesheetView />}
              {activeTab === 'scheduler' && <JobScheduler />}
            </div>
          </>
        )}
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
