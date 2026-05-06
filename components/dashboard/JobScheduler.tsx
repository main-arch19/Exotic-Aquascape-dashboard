'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, X, Bell, Search, Play, RotateCcw, Pause, SkipForward, Edit2,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Copy, Check,
  Zap, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, ArrowRight,
  Activity, Users, MapPin, Tag, Info, Radio, CreditCard, Lock, OctagonX,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { useDashboard } from '@/context/DashboardContext';
import type { Job, JobStatus } from '@/lib/types';
import {
  SCHEDULER_JOBS, SCHEDULER_WORKFLOWS,
  getSchedulerStats, formatDuration, formatRelative, formatRelativeFuture,
  type SchedulerJob, type SchedulerStatus, type ScheduleType, type ServiceType, type PaymentStatus,
} from '@/lib/mock-scheduler-db';

const NOW = new Date('2026-05-05T10:30:00');
const TABLE_PAGE_SIZE = 10;

type SubTab = 'overview' | 'jobs' | 'workflows' | 'calendar' | 'analytics';

// ── Live job mapping ──────────────────────────────────────────────────────────

const WORKER_ID_TO_NAME: Record<string, string> = {
  w1: 'Marcus Rivera',
  w2: 'Priya Nair',
  w3: 'Devon Chang',
  w4: 'Aisha Thompson',
  w5: "Liam O'Brien",
  w6: 'Sofia Morales',
  w7: 'Trent Wallace',
  w8: 'Keisha Fontaine',
};

const JOB_STATUS_MAP: Record<JobStatus, SchedulerStatus> = {
  scheduled:   'queued',
  in_progress: 'running',
  completed:   'completed',
  delayed:     'sla_at_risk',
};

function mapJobToSchedulerJob(job: Job): SchedulerJob {
  const crew = job.assignedWorkerIds
    .map((id) => WORKER_ID_TO_NAME[id])
    .filter(Boolean) as string[];

  const namePart = job.homeownerName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');

  const scheduledDate = job.scheduledTime ? new Date(job.scheduledTime) : null;
  const createdDate   = new Date(job.createdAt);
  const status        = JOB_STATUS_MAP[job.status] ?? 'queued';

  return {
    id:           job.id,
    name:         `Visit_${namePart}`,
    status,
    schedule:     scheduledDate ? format(scheduledDate, 'MMM d, h:mm a') : 'One-time',
    scheduleType: 'one_time',
    serviceType:  'Maintenance',
    crew,
    location:     job.address,
    tags:         ['live', 'from-form'],
    lastRun:      status !== 'queued' ? scheduledDate : null,
    nextRun:      status === 'queued'  ? scheduledDate : null,
    duration:     status === 'completed' ? 60 : 0,
    avgDuration:  60,
    successRate:  100,
    createdAt:    createdDate,
    dependsOn:     [],
    paymentStatus: 'deposit_pending',
    runHistory:
      status === 'completed'
        ? [{
            id:        `${job.id}-run-1`,
            startTime: scheduledDate ?? createdDate,
            duration:  60,
            status:    'completed' as const,
            log:       `[${format(scheduledDate ?? createdDate, 'HH:mm:ss')}] Scheduled visit started\n[completed] Job completed successfully`,
          }]
        : [],
  };
}

// ── Status helpers ──────────────────────────────────────────────────────────

function statusBadge(status: SchedulerStatus) {
  switch (status) {
    case 'running':     return <Badge className="border-0 bg-teal-100 text-teal-700">Running</Badge>;
    case 'completed':   return <Badge className="border-0 bg-emerald-100 text-emerald-700">Completed</Badge>;
    case 'failed':      return <Badge className="border-0 bg-red-100 text-red-700">Failed</Badge>;
    case 'queued':      return <Badge className="border-0 bg-gray-100 text-gray-500">Queued</Badge>;
    case 'sla_at_risk': return <Badge className="border-0 bg-amber-100 text-amber-700">SLA At Risk</Badge>;
  }
}

function paymentStatusBadge(ps: PaymentStatus) {
  switch (ps) {
    case 'deposit_pending': return <Badge className="border-0 bg-amber-100 text-amber-700">Deposit Pending</Badge>;
    case 'deposit_paid':    return <Badge className="border-0 bg-blue-100 text-blue-700">Deposit Paid</Badge>;
    case 'invoice_sent':    return <Badge className="border-0 bg-indigo-100 text-indigo-700">Invoice Sent</Badge>;
    case 'invoice_overdue': return <Badge className="border-0 bg-red-100 text-red-700">Invoice Overdue</Badge>;
    case 'paid_in_full':    return <Badge className="border-0 bg-emerald-100 text-emerald-700">Paid in Full</Badge>;
  }
}

const PAYMENT_SEL_CLS = 'rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400';

const STATUS_BAR_COLOR: Record<SchedulerStatus, string> = {
  running:     'bg-teal-400',
  completed:   'bg-emerald-400',
  failed:      'bg-red-400',
  queued:      'bg-gray-300',
  sla_at_risk: 'bg-amber-400',
};

const STATUS_NODE_FILL: Record<SchedulerStatus, string> = {
  running:     '#99f6e4',
  completed:   '#a7f3d0',
  failed:      '#fecaca',
  queued:      '#e5e7eb',
  sla_at_risk: '#fde68a',
};

const STATUS_NODE_TEXT: Record<SchedulerStatus, string> = {
  running:     '#0d9488',
  completed:   '#059669',
  failed:      '#dc2626',
  queued:      '#6b7280',
  sla_at_risk: '#d97706',
};

function formatTime(date: Date | null): string {
  if (!date) return '—';
  return format(date, 'MMM d, h:mm a');
}

function findJob(id: string, jobs: SchedulerJob[]): SchedulerJob | undefined {
  return jobs.find((j) => j.id === id);
}

// ── Status Summary Cards ────────────────────────────────────────────────────

function StatusCards({
  stats,
  alertCount,
}: {
  stats: ReturnType<typeof getSchedulerStats>;
  alertCount: number;
}) {
  const cards = [
    { label: 'Running',     value: stats.running,    icon: <Zap      className="h-5 w-5 text-teal-600"    />, bg: 'bg-teal-50',   pulse: true  },
    { label: 'Completed',   value: stats.completed,  icon: <CheckCircle className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50', pulse: false },
    { label: 'Failed',      value: stats.failed,     icon: <XCircle  className="h-5 w-5 text-red-500"     />, bg: 'bg-red-50',    pulse: false },
    { label: 'Queued',      value: stats.queued,     icon: <Clock    className="h-5 w-5 text-gray-400"    />, bg: 'bg-gray-50',   pulse: false },
    { label: 'SLA At Risk', value: stats.slaAtRisk,  icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50', pulse: false },
  ];

  return (
    <div className="mb-4 flex items-start gap-4">
      <div className="flex flex-1 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${c.bg}`}>{c.icon}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-gray-900">{c.value}</span>
              {c.pulse && c.value > 0 && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal-400" />
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            readOnly
            placeholder="Search  Ctrl+K"
            className="h-8 w-44 rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-xs text-gray-400 shadow-sm"
          />
        </div>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
          <Bell className="h-4 w-4 text-gray-500" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ jobs, onDismiss }: { jobs: SchedulerJob[]; onDismiss: () => void }) {
  const failed = jobs.filter((j) => j.status === 'failed');
  const sla    = jobs.filter((j) => j.status === 'sla_at_risk');
  if (failed.length === 0 && sla.length === 0) return null;

  const isFail   = failed.length > 0;
  const critical = isFail ? failed[0] : sla[0];

  return (
    <div className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${isFail ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <span className={isFail ? 'text-red-700' : 'text-amber-700'}>
        <AlertCircle className="mr-2 inline h-4 w-4" />
        {isFail
          ? `${critical.name.replace(/_/g, ' ')} failed ${formatRelative(critical.lastRun)} — ${failed.length} job${failed.length > 1 ? 's' : ''} require attention`
          : `${critical.name.replace(/_/g, ' ')} is approaching SLA deadline (${formatRelativeFuture(critical.nextRun)})`}
      </span>
      <div className="flex items-center gap-3">
        <button className={`text-xs underline ${isFail ? 'text-red-600' : 'text-amber-600'}`}>View All</button>
        <button onClick={onDismiss} className={`${isFail ? 'text-red-400 hover:text-red-600' : 'text-amber-400 hover:text-amber-600'}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Sub-Tab Nav ───────────────────────────────────────────────────────────────

function SubTabNav({ active, onChange }: { active: SubTab; onChange: (t: SubTab) => void }) {
  const tabs: { id: SubTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'jobs',       label: 'Jobs'       },
    { id: 'workflows',  label: 'Workflows'  },
    { id: 'calendar',   label: 'Calendar'   },
    { id: 'analytics',  label: 'Analytics'  },
  ];
  return (
    <div className="mb-5 flex border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === t.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── "Live" pill for form-created jobs ─────────────────────────────────────────

function LivePill() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-600">
      <Radio className="h-2 w-2" />
      Live
    </span>
  );
}

function isLiveJob(job: SchedulerJob) {
  return job.tags.includes('live');
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function GanttTimeline({ jobs, onSelectJob }: { jobs: SchedulerJob[]; onSelectJob: (j: SchedulerJob) => void }) {
  const windowStart = new Date(NOW.getTime() - 12 * 3600_000);
  const windowEnd   = new Date(NOW.getTime() +  6 * 3600_000);
  const windowDur   = windowEnd.getTime() - windowStart.getTime();

  const visibleJobs = jobs.filter((job) => {
    const start = job.status === 'queued' ? job.nextRun : job.lastRun;
    const end   = start ? new Date(start.getTime() + job.avgDuration * 60_000) : null;
    if (!start || !end) return false;
    return start < windowEnd && end > windowStart;
  });

  const crewMap = new Map<string, SchedulerJob[]>();
  for (const job of visibleJobs) {
    const primary = job.crew[0] ?? 'Unassigned';
    if (!crewMap.has(primary)) crewMap.set(primary, []);
    crewMap.get(primary)!.push(job);
  }

  const crews       = Array.from(crewMap.entries());
  const hourMarkers = Array.from({ length: 19 }, (_, i) => ({
    label: format(new Date(windowStart.getTime() + i * 3600_000), 'h a'),
    pct:   (i / 18) * 100,
  }));
  const nowPct = ((NOW.getTime() - windowStart.getTime()) / windowDur) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">Timeline — Last 12h / Next 6h</h3>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          <div className="relative ml-36 h-7 border-b border-gray-100">
            {hourMarkers.map((m, i) => (
              <span key={i} className="absolute top-1 -translate-x-1/2 text-[10px] text-gray-400" style={{ left: `${m.pct}%` }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="absolute top-0 bottom-0 w-px bg-indigo-400 z-10" style={{ left: `calc(9rem + ${nowPct}% * (100% - 9rem) / 100)` }}>
              <span className="absolute -top-0 left-1 text-[9px] font-semibold text-indigo-500">NOW</span>
            </div>
            {crews.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No jobs in the current window</div>
            ) : (
              crews.map(([crew, crewJobs]) => (
                <div key={crew} className="flex items-center border-b border-gray-50 last:border-0">
                  <div className="w-36 shrink-0 px-3 py-3 text-xs font-medium text-gray-600 truncate">{crew.split(' ')[0]}</div>
                  <div className="relative flex-1 h-10 pr-2">
                    {crewJobs.map((job) => {
                      const start       = job.status === 'queued' ? job.nextRun! : job.lastRun!;
                      const end         = new Date(start.getTime() + job.avgDuration * 60_000);
                      const cStart      = Math.max(start.getTime(), windowStart.getTime());
                      const cEnd        = Math.min(end.getTime(), windowEnd.getTime());
                      const leftPct     = ((cStart - windowStart.getTime()) / windowDur) * 100;
                      const widthPct    = ((cEnd - cStart) / windowDur) * 100;
                      const live        = isLiveJob(job);
                      return (
                        <button
                          key={job.id}
                          onClick={() => onSelectJob(job)}
                          title={job.name.replace(/_/g, ' ')}
                          className={`absolute top-1.5 h-7 rounded cursor-pointer opacity-90 hover:opacity-100 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-400 transition-all ${STATUS_BAR_COLOR[job.status]} ${live ? 'ring-2 ring-indigo-300' : ''}`}
                          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
                        >
                          <span className="absolute left-1.5 top-0.5 text-[9px] font-medium text-white/90 whitespace-nowrap overflow-hidden max-w-full">
                            {job.name.replace(/_/g, ' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentFailures({ jobs, onSelectJob }: { jobs: SchedulerJob[]; onSelectJob: (j: SchedulerJob) => void }) {
  const failed = jobs.filter((j) => j.status === 'failed');

  const liveEvents = [
    { time: formatTime(new Date(NOW.getTime() - 15  * 60_000)), text: 'Full_Setup_Coral_Springs started',      type: 'start'    },
    { time: formatTime(new Date(NOW.getTime() - 45  * 60_000)), text: 'Water_Test_Ocean_Dr_Followup started',  type: 'start'    },
    { time: formatTime(new Date(NOW.getTime() - 60  * 60_000)), text: 'Equipment_Delivery_Ocean_Dr started',   type: 'start'    },
    { time: formatTime(new Date(NOW.getTime() - 120 * 60_000)), text: 'Emergency_Repair_Palmetto failed',      type: 'fail'     },
    { time: formatTime(new Date(NOW.getTime() - 240 * 60_000)), text: 'Equipment_Delivery_Palmetto completed', type: 'complete' },
  ];

  return (
    <div className="mt-6 grid grid-cols-5 gap-4">
      <div className="col-span-3">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Recent Failures</h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {failed.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No recent failures</div>
          ) : (
            failed.slice(0, 5).map((job) => {
              const lastLog = job.runHistory[0]?.log.split('\n').slice(-2, -1)[0] ?? '';
              return (
                <div key={job.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => onSelectJob(job)}>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">{job.name.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400">{formatTime(job.lastRun)}</span>
                    {lastLog && <span className="ml-3 text-xs text-red-500 truncate">{lastLog.trim()}</span>}
                  </div>
                  <button className="ml-4 shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                    Retry
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="col-span-2">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Live Activity</h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {liveEvents.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ev.type === 'fail' ? 'bg-red-400' : ev.type === 'complete' ? 'bg-emerald-400' : 'bg-teal-400'}`} />
              <div>
                <p className="text-xs text-gray-700">{ev.text.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-gray-400">{ev.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ jobs, onSelectJob }: { jobs: SchedulerJob[]; onSelectJob: (j: SchedulerJob) => void }) {
  return (
    <div>
      <GanttTimeline jobs={jobs} onSelectJob={onSelectJob} />
      <RecentFailures jobs={jobs} onSelectJob={onSelectJob} />
    </div>
  );
}

// ── Tab 2: Jobs ───────────────────────────────────────────────────────────────

function JobsTab({ jobs, onSelectJob, onPaymentChange, onStatusChange }: {
  jobs: SchedulerJob[];
  onSelectJob: (j: SchedulerJob) => void;
  onPaymentChange: (id: string, ps: PaymentStatus) => void;
  onStatusChange: (id: string, s: SchedulerStatus) => void;
}) {
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState<SchedulerStatus | 'all'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleType | 'all'>('all');
  const [serviceFilter,  setServiceFilter]  = useState<ServiceType | 'all'>('all');
  const [page,           setPage]           = useState(0);
  const [sortKey,        setSortKey]        = useState('name');
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('asc');
  const [hoveredRow,     setHoveredRow]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (statusFilter   !== 'all') list = list.filter((j) => j.status       === statusFilter);
    if (scheduleFilter !== 'all') list = list.filter((j) => j.scheduleType === scheduleFilter);
    if (serviceFilter  !== 'all') list = list.filter((j) => j.serviceType  === serviceFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.crew.some((c) => c.toLowerCase().includes(q)) ||
          j.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    list.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortKey === 'name')        { av = a.name;                    bv = b.name; }
      if (sortKey === 'status')      { av = a.status;                  bv = b.status; }
      if (sortKey === 'lastRun')     { av = a.lastRun?.getTime() ?? 0; bv = b.lastRun?.getTime() ?? 0; }
      if (sortKey === 'nextRun')     { av = a.nextRun?.getTime() ?? 0; bv = b.nextRun?.getTime() ?? 0; }
      if (sortKey === 'duration')    { av = a.avgDuration;             bv = b.avgDuration; }
      if (sortKey === 'successRate') { av = a.successRate;             bv = b.successRate; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [jobs, search, statusFilter, scheduleFilter, serviceFilter, sortKey, sortDir]);

  const pageCount = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const paged     = filtered.slice(page * TABLE_PAGE_SIZE, (page + 1) * TABLE_PAGE_SIZE);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  }

  function SortInd({ col }: { col: string }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const sel = 'rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400';

  const liveCount = jobs.filter(isLiveJob).length;

  return (
    <div>
      {liveCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span><strong>{liveCount}</strong> job{liveCount > 1 ? 's' : ''} synced from &ldquo;Create New Job&rdquo; — shown at top</span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search jobs..."
            className="h-8 rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select className={sel} value={statusFilter}   onChange={(e) => { setStatusFilter(e.target.value as SchedulerStatus | 'all'); setPage(0); }}>
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
          <option value="sla_at_risk">SLA At Risk</option>
        </select>
        <select className={sel} value={scheduleFilter} onChange={(e) => { setScheduleFilter(e.target.value as ScheduleType | 'all'); setPage(0); }}>
          <option value="all">All Schedule Types</option>
          <option value="recurring">Recurring</option>
          <option value="one_time">One-time</option>
          <option value="event_triggered">Event-triggered</option>
        </select>
        <select className={sel} value={serviceFilter}  onChange={(e) => { setServiceFilter(e.target.value as ServiceType | 'all'); setPage(0); }}>
          <option value="all">All Service Types</option>
          <option value="Installation">Installation</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Water Testing">Water Testing</option>
          <option value="Equipment Delivery">Equipment Delivery</option>
          <option value="Emergency Repair">Emergency Repair</option>
          <option value="Deep Clean">Deep Clean</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} jobs</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Job Status <SortInd col="status" /></TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>Job Name <SortInd col="name" /></TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('lastRun')}>Last Run <SortInd col="lastRun" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('nextRun')}>Next Run <SortInd col="nextRun" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('duration')}>Duration <SortInd col="duration" /></TableHead>
              <TableHead>Crew</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((job) => {
              const live = isLiveJob(job);
              return (
                <TableRow
                  key={job.id}
                  className={`cursor-pointer group ${live ? 'bg-indigo-50/40 hover:bg-indigo-50' : ''}`}
                  onMouseEnter={() => setHoveredRow(job.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onSelectJob(job)}
                >
                  <TableCell>{statusBadge(job.status)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <select
                      value={job.paymentStatus}
                      onChange={(e) => onPaymentChange(job.id, e.target.value as PaymentStatus)}
                      className={PAYMENT_SEL_CLS}
                    >
                      <option value="deposit_pending">Deposit Pending</option>
                      <option value="deposit_paid">Deposit Paid</option>
                      <option value="invoice_sent">Invoice Sent</option>
                      <option value="invoice_overdue">Invoice Overdue</option>
                      <option value="paid_in_full">Paid in Full</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 text-sm">{job.name.replace(/_/g, ' ')}</span>
                    {live && <LivePill />}
                  </TableCell>
                  <TableCell><span className="font-mono text-xs text-gray-400">{job.id}</span></TableCell>
                  <TableCell className="text-xs text-gray-600">{job.schedule}</TableCell>
                  <TableCell className="text-xs text-gray-500">{formatRelative(job.lastRun)}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {job.paymentStatus === 'deposit_pending'
                      ? <span className="flex items-center gap-1 text-amber-600 font-medium"><Lock className="h-3 w-3" />Blocked</span>
                      : formatRelativeFuture(job.nextRun)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{formatDuration(job.avgDuration)}</TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[120px] truncate">{job.crew.join(', ')}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {job.tags.filter((t) => t !== 'live' && t !== 'from-form').slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{t}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hoveredRow === job.id && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onStatusChange(job.id, 'running')}   className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Retry</button>
                        <button onClick={() => onStatusChange(job.id, 'queued')}    className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Pause</button>
                        <button onClick={() => onSelectJob(job)}                    className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Log</button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{page * TABLE_PAGE_SIZE + 1}–{Math.min((page + 1) * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <button disabled={page === 0}            onClick={() => setPage((p) => p - 1)} className="rounded-md border border-gray-200 px-2.5 py-1 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft  className="h-3.5 w-3.5" /></button>
            <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-gray-200 px-2.5 py-1 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Workflows (DAG) ───────────────────────────────────────────────────

function WorkflowsTab({ jobs, onSelectJob }: { jobs: SchedulerJob[]; onSelectJob: (j: SchedulerJob) => void }) {
  const [selectedWf, setSelectedWf] = useState(SCHEDULER_WORKFLOWS[0].id);
  const workflow = SCHEDULER_WORKFLOWS.find((w) => w.id === selectedWf)!;
  const wfJobs   = workflow.jobIds.map((id) => findJob(id, jobs)).filter(Boolean) as SchedulerJob[];

  const NODE_W = 180, NODE_H = 52, COL_GAP = 80, ROW_GAP = 28;

  const depthMap = useMemo(() => {
    const depths: Record<string, number> = {};
    function getDepth(id: string): number {
      if (depths[id] !== undefined) return depths[id];
      const job = findJob(id, jobs);
      if (!job || job.dependsOn.length === 0) return (depths[id] = 0);
      const pd = job.dependsOn.filter((pid) => workflow.jobIds.includes(pid)).map(getDepth);
      return (depths[id] = pd.length > 0 ? Math.max(...pd) + 1 : 0);
    }
    workflow.jobIds.forEach(getDepth);
    return depths;
  }, [workflow, jobs]);

  const maxDepth = Math.max(...Object.values(depthMap), 0);
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of workflow.jobIds) layers[depthMap[id] ?? 0].push(id);

  const maxLayerSize = Math.max(...layers.map((l) => l.length));
  const positions: Record<string, { x: number; y: number }> = {};
  for (let col = 0; col <= maxDepth; col++) {
    const layer  = layers[col];
    const totalH = layer.length * NODE_H + (layer.length - 1) * ROW_GAP;
    const startY = (maxLayerSize * (NODE_H + ROW_GAP) - totalH) / 2;
    layer.forEach((id, row) => { positions[id] = { x: col * (NODE_W + COL_GAP), y: startY + row * (NODE_H + ROW_GAP) }; });
  }

  const svgW = (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP + 20;
  const svgH = maxLayerSize * (NODE_H + ROW_GAP) + 20;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <select value={selectedWf} onChange={(e) => setSelectedWf(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
          {SCHEDULER_WORKFLOWS.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
        </select>
        <span className="text-xs text-gray-400">{wfJobs.length} jobs</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 overflow-x-auto">
        <svg width={svgW} height={Math.max(svgH, 120)} className="overflow-visible">
          <defs>
            <marker id="arrow"          markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" /></marker>
            <marker id="arrow-critical" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#6366f1" /></marker>
          </defs>

          {wfJobs.map((job) =>
            job.dependsOn.filter((pid) => workflow.jobIds.includes(pid)).map((pid) => {
              const from = positions[pid]; const to = positions[job.id];
              if (!from || !to) return null;
              const isCrit = findJob(pid, jobs)?.status === 'running' || findJob(pid, jobs)?.status === 'sla_at_risk';
              const x1 = from.x + NODE_W + 10, y1 = from.y + NODE_H / 2;
              const x2 = to.x - 10,            y2 = to.y   + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path key={`${pid}-${job.id}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none" stroke={isCrit ? '#6366f1' : '#94a3b8'}
                  strokeWidth={isCrit ? 2 : 1.5} strokeDasharray={isCrit ? undefined : '4 2'}
                  markerEnd={isCrit ? 'url(#arrow-critical)' : 'url(#arrow)'}
                />
              );
            })
          )}

          {wfJobs.map((job) => {
            const pos = positions[job.id]; if (!pos) return null;
            const words = job.name.replace(/_/g, ' ').split(' ');
            const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
            return (
              <g key={job.id} transform={`translate(${pos.x},${pos.y})`} className="cursor-pointer" onClick={() => onSelectJob(job)}>
                <rect width={NODE_W} height={NODE_H} rx={8} fill={STATUS_NODE_FILL[job.status]} stroke={STATUS_NODE_TEXT[job.status]} strokeWidth={1.5} />
                <text x={NODE_W / 2} y={NODE_H / 2 - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={STATUS_NODE_TEXT[job.status]}>{line1}</text>
                <text x={NODE_W / 2} y={NODE_H / 2 + 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={STATUS_NODE_TEXT[job.status]}>{line2}</text>
                <text x={NODE_W / 2} y={NODE_H - 5}     textAnchor="middle" fontSize={8}  fill={STATUS_NODE_TEXT[job.status]} opacity={0.7}>{job.status.replace('_', ' ')}</text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
          {(Object.entries(STATUS_NODE_FILL) as [SchedulerStatus, string][]).map(([status, fill]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: fill, borderColor: STATUS_NODE_TEXT[status] }} />
              <span className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Calendar ───────────────────────────────────────────────────────────

const BLACKOUT_RANGES = [
  { start: new Date('2026-05-10'), end: new Date('2026-05-10'), label: 'Equipment Service Window' },
  { start: new Date('2026-05-20'), end: new Date('2026-05-21'), label: 'Fleet Maintenance Blackout' },
];

function isBlackout(date: Date) {
  return BLACKOUT_RANGES.some((r) => date >= r.start && date <= r.end);
}

function CalendarTab({ jobs, onSelectJob }: { jobs: SchedulerJob[]; onSelectJob: (j: SchedulerJob) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-05-01'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2026-05-05'));

  function jobsForDate(date: Date): SchedulerJob[] {
    return jobs.filter((j) => (j.lastRun && isSameDay(j.lastRun, date)) || (j.nextRun && isSameDay(j.nextRun, date)));
  }

  const days         = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) });
  const upcomingToday = jobs.filter((j) => j.nextRun && isSameDay(j.nextRun, NOW)).sort((a, b) => (a.nextRun?.getTime() ?? 0) - (b.nextRun?.getTime() ?? 0));

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"><ChevronLeft  className="h-4 w-4 text-gray-500" /></button>
          <h3 className="text-sm font-semibold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"><ChevronRight className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium uppercase text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
          {days.map((day) => {
            const dayJobs        = jobsForDate(day);
            const inMonth        = isSameMonth(day, currentMonth);
            const isToday        = isSameDay(day, NOW);
            const isSelected     = selectedDate && isSameDay(day, selectedDate);
            const blackout       = isBlackout(day);
            const hasLive        = dayJobs.some(isLiveJob);
            const hasDepositLock = dayJobs.some((j) => j.paymentStatus === 'deposit_pending');
            const hasStopWork    = dayJobs.some((j) => j.paymentStatus === 'invoice_overdue');
            const isPaymentLocked = hasDepositLock || hasStopWork;
            return (
              <div
                key={day.toISOString()}
                className={[
                  'relative p-1.5 min-h-[80px] transition-colors',
                  !inMonth ? 'opacity-40' : '',
                  isPaymentLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50',
                  isSelected ? 'ring-2 ring-inset ring-indigo-400' : '',
                  blackout    ? 'bg-gray-50'  : '',
                  hasStopWork ? 'bg-red-50'   : hasDepositLock ? 'bg-amber-50' : 'bg-white',
                  hasLive && !isPaymentLocked ? 'ring-1 ring-inset ring-indigo-200' : '',
                ].join(' ')}
                onClick={() => setSelectedDate(isSelected ? null : day)}
              >
                {/* Payment lock stripe overlay */}
                {isPaymentLocked && (
                  <div className={`absolute inset-0 pointer-events-none ${hasStopWork ? 'bg-red-500/5' : 'bg-amber-500/5'}`}
                    style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 6px, ${hasStopWork ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'} 6px, ${hasStopWork ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'} 12px)` }}
                  />
                )}
                <div className="flex items-center justify-between relative">
                  <span className={`text-xs font-medium ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]' : 'text-gray-600'}`}>
                    {format(day, 'd')}
                  </span>
                  {blackout && !isPaymentLocked && <span className="text-[9px] text-gray-400 italic">blocked</span>}
                  {hasStopWork    && <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5"><OctagonX className="h-2.5 w-2.5" />STOP</span>}
                  {!hasStopWork && hasDepositLock && <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" />LOCK</span>}
                  {!isPaymentLocked && hasLive && <span className="text-[9px] font-semibold text-indigo-500">LIVE</span>}
                </div>
                {blackout && !isPaymentLocked && (
                  <div className="mt-1 rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-400 truncate relative">
                    {BLACKOUT_RANGES.find((r) => day >= r.start && day <= r.end)?.label}
                  </div>
                )}
                {hasStopWork && (
                  <div className="mt-1 rounded bg-red-100 border border-red-200 px-1 py-0.5 text-[9px] text-red-700 truncate font-semibold relative">
                    Invoice Overdue
                  </div>
                )}
                {!hasStopWork && hasDepositLock && (
                  <div className="mt-1 rounded bg-amber-100 border border-amber-200 px-1 py-0.5 text-[9px] text-amber-700 truncate font-semibold relative">
                    Deposit Pending
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-0.5 relative">
                  {dayJobs.slice(0, 3).map((job) => (
                    <span key={job.id} className={`inline-block h-2 w-2 rounded-full ${
                      job.paymentStatus === 'invoice_overdue' ? 'bg-red-500'   :
                      job.paymentStatus === 'deposit_pending' ? 'bg-amber-400' :
                      job.status === 'completed'   ? 'bg-emerald-400' :
                      job.status === 'running'     ? 'bg-teal-400'    :
                      job.status === 'failed'      ? 'bg-red-400'     :
                      job.status === 'sla_at_risk' ? 'bg-amber-400'   : 'bg-gray-300'
                    } ${isLiveJob(job) ? 'ring-1 ring-indigo-400' : ''}`} title={job.name.replace(/_/g, ' ')} />
                  ))}
                  {dayJobs.length > 3 && <span className="text-[9px] text-gray-400">+{dayJobs.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar legend */}
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Invoice Overdue — stop-work</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />Deposit Pending — scheduling locked</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />Compliant</span>
        </div>

        {selectedDate && (() => {
          const selJobs        = jobsForDate(selectedDate);
          const selStopWork    = selJobs.filter((j) => j.paymentStatus === 'invoice_overdue');
          const selDepositLock = selJobs.filter((j) => j.paymentStatus === 'deposit_pending');
          const selLocked      = selStopWork.length > 0 || selDepositLock.length > 0;
          return (
            <div className={`mt-4 rounded-xl border shadow-sm p-4 ${selStopWork.length > 0 ? 'border-red-200 bg-red-50' : selDepositLock.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">{format(selectedDate, 'EEEE, MMMM d')}</h4>
                {selStopWork.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    <OctagonX className="h-3 w-3" />Stop-Work Active
                  </span>
                )}
                {!selStopWork.length && selDepositLock.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Lock className="h-3 w-3" />Scheduling Locked
                  </span>
                )}
              </div>

              {selStopWork.length > 0 && (
                <div className="mb-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                  <p className="font-semibold mb-0.5">Stop-work triggered — no new scheduling allowed</p>
                  <p className="text-red-500">Resolve outstanding invoice for: {selStopWork.map((j) => j.name.replace(/_/g, ' ')).join(', ')}</p>
                </div>
              )}
              {selDepositLock.length > 0 && !selStopWork.length && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-700">
                  <p className="font-semibold mb-0.5">Calendar locked — deposit required before scheduling</p>
                  <p className="text-amber-500">Awaiting deposit for: {selDepositLock.map((j) => j.name.replace(/_/g, ' ')).join(', ')}</p>
                </div>
              )}

              {selJobs.length === 0 ? (
                selLocked
                  ? <p className="text-xs text-gray-400">No jobs on this day — new scheduling blocked by payment compliance.</p>
                  : <p className="text-xs text-gray-400">No jobs scheduled for this day</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {selJobs.map((job) => (
                    <div key={job.id} className={`flex items-center justify-between py-2 rounded px-1 ${
                      job.paymentStatus === 'invoice_overdue' || job.paymentStatus === 'deposit_pending'
                        ? 'opacity-75 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-gray-50'
                    } ${isLiveJob(job) ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => {
                        if (job.paymentStatus !== 'invoice_overdue' && job.paymentStatus !== 'deposit_pending') onSelectJob(job);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(job.status)}
                        {paymentStatusBadge(job.paymentStatus)}
                        <span className="text-sm font-medium text-gray-800">{job.name.replace(/_/g, ' ')}</span>
                        {isLiveJob(job) && <LivePill />}
                        {(job.paymentStatus === 'invoice_overdue' || job.paymentStatus === 'deposit_pending') && (
                          <Lock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {job.lastRun && isSameDay(job.lastRun, selectedDate) ? format(job.lastRun, 'h:mm a')
                         : job.nextRun && isSameDay(job.nextRun, selectedDate) ? format(job.nextRun, 'h:mm a') : '—'}
                        {' · '}{formatDuration(job.avgDuration)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div className="w-52 shrink-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Upcoming Today</h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {upcomingToday.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">No upcoming jobs</div>
          ) : (
            upcomingToday.slice(0, 10).map((job) => {
              const payLocked = job.paymentStatus === 'deposit_pending' || job.paymentStatus === 'invoice_overdue';
              return (
                <div key={job.id} className={`px-3 py-2.5 ${payLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-50'} ${isLiveJob(job) ? 'border-l-2 border-indigo-400' : ''} ${job.paymentStatus === 'invoice_overdue' ? 'bg-red-50' : job.paymentStatus === 'deposit_pending' ? 'bg-amber-50' : ''}`}
                  onClick={() => { if (!payLocked) onSelectJob(job); }}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-xs font-medium text-gray-800 truncate flex-1">{job.name.replace(/_/g, ' ')}</p>
                    {job.paymentStatus === 'invoice_overdue' && <OctagonX className="h-3 w-3 text-red-500 shrink-0" />}
                    {job.paymentStatus === 'deposit_pending' && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-gray-400">{job.nextRun ? format(job.nextRun, 'h:mm a') : '—'} · {job.serviceType}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Analytics ──────────────────────────────────────────────────────────

const CREW_MEMBERS = ['Marcus Rivera','Priya Nair','Devon Chang','Trent Wallace','Aisha Thompson','Keisha Fontaine',"Liam O'Brien"];

function crewStatus(name: string, jobs: SchedulerJob[]) {
  const running = jobs.find((j) => j.status === 'running' && j.crew.includes(name));
  if (running) return { status: 'busy' as const, currentJob: running.name.replace(/_/g, ' '), utilization: 85 };
  if (name === "Liam O'Brien") return { status: 'offline' as const, currentJob: null, utilization: 0 };
  const utils: Record<string, number> = { 'Marcus Rivera': 72, 'Priya Nair': 68, 'Devon Chang': 45, 'Trent Wallace': 90, 'Aisha Thompson': 55, 'Keisha Fontaine': 60 };
  return { status: 'available' as const, currentJob: null, utilization: utils[name] ?? 50 };
}

function generate30DayData(jobs: SchedulerJob[]) {
  return Array.from({ length: 30 }, (_, i) => {
    const date    = format(new Date(NOW.getTime() - (29 - i) * 24 * 3600_000), 'MMM d');
    const success = Math.round(8 + Math.random() * 6) + (i >= 28 ? jobs.filter(isLiveJob).length : 0);
    const failed  = Math.round(Math.random() * 3);
    return { date, success, failed };
  });
}

function generateDurationByType() {
  return [
    { name: 'Install',     avgDuration: Math.round(210 * (0.85 + Math.random() * 0.3)) },
    { name: 'Maint',       avgDuration: Math.round( 62 * (0.85 + Math.random() * 0.3)) },
    { name: 'Water Test',  avgDuration: Math.round( 25 * (0.85 + Math.random() * 0.3)) },
    { name: 'Delivery',    avgDuration: Math.round( 88 * (0.85 + Math.random() * 0.3)) },
    { name: 'Emergency',   avgDuration: Math.round( 83 * (0.85 + Math.random() * 0.3)) },
    { name: 'Deep Clean',  avgDuration: Math.round(120 * (0.85 + Math.random() * 0.3)) },
  ];
}

function AnalyticsTab({ jobs }: { jobs: SchedulerJob[] }) {
  const totalJobs    = jobs.length;
  const allRuns      = jobs.flatMap((j) => j.runHistory);
  const completedRuns = allRuns.filter((r) => r.status === 'completed').length;
  const successRate  = allRuns.length > 0 ? Math.round((completedRuns / allRuns.length) * 100) : 0;
  const avgDur       = totalJobs > 0 ? Math.round(jobs.reduce((s, j) => s + j.avgDuration, 0) / totalJobs) : 0;
  const slaCompliance = totalJobs > 0 ? Math.round(jobs.filter((j) => j.status !== 'failed' && j.status !== 'sla_at_risk').length / totalJobs * 100) : 0;

  const kpis = [
    { label: 'Success Rate',      value: `${successRate}%`,         trend: 'up',   change: '+2.1%' },
    { label: 'Avg Job Duration',  value: formatDuration(avgDur),    trend: 'down', change: '-8m'   },
    { label: 'SLA Compliance',    value: `${slaCompliance}%`,       trend: 'up',   change: '+1.5%' },
    { label: 'Total Jobs (30d)',  value: String(totalJobs),         trend: 'up',   change: '+3'    },
  ];

  const trend30      = useMemo(() => generate30DayData(jobs), [jobs]);
  const durationData = useMemo(() => generateDurationByType(), []);
  const histAvg      = Math.round(durationData.reduce((s, d) => s + d.avgDuration, 0) / durationData.length);

  return (
    <div>
      <div className="mb-6 grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{k.value}</p>
            <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${k.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {k.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {k.change} vs last month
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Success vs Failure — 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend30} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Success" />
              <Line type="monotone" dataKey="failed"  stroke="#ef4444" strokeWidth={2} dot={false} name="Failed"  />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Avg Duration by Service Type (min)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v}m`, 'Avg Duration']} />
              <Bar dataKey="avgDuration" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <ReferenceLine y={histAvg} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Avg', fontSize: 9, fill: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">Crew / Resource Status</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {CREW_MEMBERS.map((name) => {
            const info = crewStatus(name, jobs);
            return (
              <div key={name} className="flex items-center gap-4 px-4 py-3">
                <div className="w-32 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${info.status === 'busy' ? 'bg-amber-400' : info.status === 'available' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                  </div>
                </div>
                <Badge className={`shrink-0 border-0 capitalize ${info.status === 'busy' ? 'bg-amber-100 text-amber-700' : info.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {info.status}
                </Badge>
                <span className="flex-1 text-xs text-gray-500 truncate min-w-0">{info.currentJob ?? '—'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-2 w-24 rounded-full bg-indigo-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${info.utilization}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-500">{info.utilization}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Job Detail Side Panel ─────────────────────────────────────────────────────

function SidePanel({ job, jobs, onClose, onNavigate, onPaymentChange, onStatusChange }: { job: SchedulerJob; jobs: SchedulerJob[]; onClose: () => void; onNavigate: (j: SchedulerJob) => void; onPaymentChange: (id: string, ps: PaymentStatus) => void; onStatusChange: (id: string, s: SchedulerStatus) => void }) {
  const [logCopied, setLogCopied] = useState(false);
  const lastLog  = job.runHistory[0]?.log ?? 'No log available.';
  const deps     = job.dependsOn.map((id) => findJob(id, jobs)).filter(Boolean) as SchedulerJob[];
  const dependents = jobs.filter((j) => j.dependsOn.includes(job.id));
  const live     = isLiveJob(job);

  const sparkData = job.runHistory.slice(0, 8).reverse().map((r, i) => ({ i, dur: r.status === 'failed' ? 0 : r.duration }));

  function copyLog() {
    navigator.clipboard.writeText(lastLog).then(() => { setLogCopied(true); setTimeout(() => setLogCopied(false), 1500); });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[40%] min-w-[360px] max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-gray-900 truncate">{job.name.replace(/_/g, ' ')}</h2>
                {statusBadge(job.status)}
                {live && <LivePill />}
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-gray-400">{job.id}</p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>

          {live && (
            <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700">
              <Radio className="mr-1.5 inline h-3 w-3 animate-pulse" />
              Created via &ldquo;Create New Job&rdquo; — synced live from field operations
            </div>
          )}

          {job.paymentStatus === 'deposit_pending' && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0" />
              Scheduling blocked — deposit required before this job can be scheduled
            </div>
          )}
          {job.paymentStatus === 'invoice_overdue' && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 flex items-center gap-1.5">
              <OctagonX className="h-3 w-3 shrink-0" />
              Stop-work active — outstanding invoice must be resolved to resume
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(() => {
              const payLocked  = job.paymentStatus === 'deposit_pending' || job.paymentStatus === 'invoice_overdue';
              const depLocked  = job.paymentStatus === 'deposit_pending';
              type Action = 'Run Now' | 'Retry' | 'Pause' | 'Resume' | 'Skip' | 'Edit Schedule';
              const actions: Action[] = ['Run Now', 'Retry', job.status === 'running' ? 'Pause' : 'Resume', 'Skip', 'Edit Schedule'];
              const actionStatus: Record<Action, SchedulerStatus | null> = {
                'Run Now':       'running',
                'Retry':         'running',
                'Pause':         'sla_at_risk',
                'Resume':        'running',
                'Skip':          'completed',
                'Edit Schedule': null,
              };
              const blockedActions = new Set<Action>(payLocked ? ['Run Now', 'Resume', 'Retry'] : []);
              if (depLocked) blockedActions.add('Edit Schedule');
              return actions.map((action) => {
                const blocked = blockedActions.has(action);
                return (
                  <button
                    key={action}
                    disabled={blocked}
                    onClick={() => {
                      const s = actionStatus[action];
                      if (s) onStatusChange(job.id, s);
                    }}
                    title={blocked ? (payLocked ? 'Blocked by payment compliance' : undefined) : undefined}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${blocked ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {action === 'Run Now'       && <Play        className="h-3 w-3" />}
                    {action === 'Retry'         && <RotateCcw   className="h-3 w-3" />}
                    {(action === 'Pause' || action === 'Resume') && <Pause className="h-3 w-3" />}
                    {action === 'Skip'          && <SkipForward className="h-3 w-3" />}
                    {action === 'Edit Schedule' && <Edit2       className="h-3 w-3" />}
                    {action}
                    {blocked && <Lock className="h-2.5 w-2.5" />}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Details</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="col-span-2">
                <dt className="flex items-center gap-1 font-medium text-gray-400 mb-1">
                  <Activity className="h-3 w-3" />Job Status
                  {(job.paymentStatus === 'deposit_pending' || job.paymentStatus === 'invoice_overdue') && (
                    <span className="ml-1 text-[10px] text-gray-400 italic">(controlled by payment)</span>
                  )}
                </dt>
                <dd className="flex items-center gap-2 flex-wrap">
                  {statusBadge(job.status)}
                  <select
                    value={job.status}
                    onChange={(e) => onStatusChange(job.id, e.target.value as SchedulerStatus)}
                    disabled={job.paymentStatus === 'deposit_pending' || job.paymentStatus === 'invoice_overdue'}
                    className={`${PAYMENT_SEL_CLS} ${(job.paymentStatus === 'deposit_pending' || job.paymentStatus === 'invoice_overdue') ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <option value="queued">Queued</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="sla_at_risk">SLA At Risk</option>
                  </select>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="flex items-center gap-1 font-medium text-gray-400 mb-1"><CreditCard className="h-3 w-3" />Payment Status</dt>
                <dd className="flex items-center gap-2 flex-wrap">
                  {paymentStatusBadge(job.paymentStatus)}
                  <select
                    value={job.paymentStatus}
                    onChange={(e) => onPaymentChange(job.id, e.target.value as PaymentStatus)}
                    className={PAYMENT_SEL_CLS}
                  >
                    <option value="deposit_pending">Deposit Pending</option>
                    <option value="deposit_paid">Deposit Paid</option>
                    <option value="invoice_sent">Invoice Sent</option>
                    <option value="invoice_overdue">Invoice Overdue</option>
                    <option value="paid_in_full">Paid in Full</option>
                  </select>
                </dd>
              </div>
              {[
                { icon: <Info     className="h-3 w-3" />, label: 'Service',      value: job.serviceType                   },
                { icon: <Calendar className="h-3 w-3" />, label: 'Schedule',     value: job.schedule                       },
                { icon: <MapPin   className="h-3 w-3" />, label: 'Location',     value: job.location                       },
                { icon: <Users    className="h-3 w-3" />, label: 'Crew',         value: job.crew.join(', ') || '—'         },
                { icon: <Clock    className="h-3 w-3" />, label: 'Avg Duration', value: formatDuration(job.avgDuration)    },
                { icon: <Activity className="h-3 w-3" />, label: 'Success Rate', value: `${job.successRate}%`              },
                { icon: <Tag      className="h-3 w-3" />, label: 'Tags',         value: job.tags.filter((t) => t !== 'live' && t !== 'from-form').join(', ') || '—' },
                { icon: <Clock    className="h-3 w-3" />, label: 'Created',      value: formatTime(job.createdAt)          },
              ].map(({ icon, label, value }) => (
                <div key={label} className="col-span-1">
                  <dt className="flex items-center gap-1 font-medium text-gray-400 mb-0.5">{icon}{label}</dt>
                  <dd className="text-gray-700 truncate" title={value}>{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Run History (last {Math.min(job.runHistory.length, 10)})</h3>
            {job.runHistory.length === 0 ? (
              <p className="text-xs text-gray-400">No runs yet</p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {job.runHistory.slice(0, 10).map((run) => (
                  <div key={run.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-teal-400'}`} />
                    <span className="flex-1 text-gray-500 truncate">{formatTime(run.startTime)}</span>
                    <span className="text-gray-500">{run.status === 'failed' ? '—' : formatDuration(run.duration)}</span>
                    <span className={`font-medium capitalize ${run.status === 'completed' ? 'text-emerald-600' : run.status === 'failed' ? 'text-red-500' : 'text-teal-600'}`}>{run.status}</span>
                  </div>
                ))}
              </div>
            )}
            {sparkData.length > 1 && (
              <div className="mt-3">
                <p className="text-[10px] text-gray-400 mb-1">Duration trend (min)</p>
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={sparkData} margin={{ top: 2, right: 4, bottom: 0, left: -30 }}>
                    <Line type="monotone" dataKey="dur" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                    <YAxis tick={{ fontSize: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="border-b border-gray-100 px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">Latest Log</h3>
              <button onClick={copyLog} className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50">
                {logCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {logCopied ? 'Copied!' : 'Copy Log'}
              </button>
            </div>
            <pre className="max-h-40 overflow-y-auto rounded-lg bg-gray-900 p-3 font-mono text-[10px] leading-relaxed text-gray-200 whitespace-pre-wrap">{lastLog}</pre>
          </div>

          {(deps.length > 0 || dependents.length > 0) && (
            <div className="px-6 py-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">Dependencies</h3>
              {deps.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-400 mb-1.5">Upstream (requires)</p>
                  {deps.map((dep) => (
                    <button key={dep.id} className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50" onClick={() => onNavigate(dep)}>
                      {statusBadge(dep.status)}
                      <span className="flex-1 text-xs font-medium text-gray-700 truncate">{dep.name.replace(/_/g, ' ')}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
              {dependents.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-gray-400 mb-1.5">Downstream (blocks)</p>
                  {dependents.map((dep) => (
                    <button key={dep.id} className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50" onClick={() => onNavigate(dep)}>
                      {statusBadge(dep.status)}
                      <span className="flex-1 text-xs font-medium text-gray-700 truncate">{dep.name.replace(/_/g, ' ')}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Root Component ─────────────────────────────────────────────────────────────

export function JobScheduler() {
  const { jobs: liveJobs } = useDashboard();

  const [activeSubTab,     setActiveSubTab]     = useState<SubTab>('overview');
  const [selectedJob,      setSelectedJob]      = useState<SchedulerJob | null>(null);
  const [alertDismissed,   setAlertDismissed]   = useState(false);
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, PaymentStatus>>({});
  const [statusOverrides,  setStatusOverrides]  = useState<Record<string, SchedulerStatus>>({});
  const [triggerNotice,    setTriggerNotice]    = useState<{ msg: string; type: 'info' | 'warn' | 'error' } | null>(null);

  // Map live dashboard jobs → SchedulerJob and prepend to mock list
  const mappedLiveJobs = useMemo<SchedulerJob[]>(
    () => liveJobs.map(mapJobToSchedulerJob),
    [liveJobs],
  );

  const allJobs = useMemo<SchedulerJob[]>(
    () => [...mappedLiveJobs, ...SCHEDULER_JOBS],
    [mappedLiveJobs],
  );

  // Payment compliance takes priority over manual status overrides
  const effectiveJobs = useMemo<SchedulerJob[]>(() => {
    return allJobs.map((job) => {
      const ps         = paymentOverrides[job.id] ?? job.paymentStatus;
      const baseStatus = statusOverrides[job.id]  ?? job.status;
      if (ps === 'deposit_pending') return { ...job, paymentStatus: ps, status: 'queued' as SchedulerStatus, nextRun: null };
      if (ps === 'invoice_overdue') return { ...job, paymentStatus: ps, status: 'failed' as SchedulerStatus };
      return { ...job, paymentStatus: ps, status: baseStatus };
    });
  }, [allJobs, paymentOverrides, statusOverrides]);

  function onPaymentChange(id: string, ps: PaymentStatus) {
    const curPayment = paymentOverrides[id] ?? allJobs.find((j) => j.id === id)?.paymentStatus;
    const curStatus  = statusOverrides[id]  ?? allJobs.find((j) => j.id === id)?.status;

    if (ps === 'deposit_pending' && (curStatus === 'running' || curStatus === 'queued')) {
      setTriggerNotice({ msg: 'Deposit Pending — scheduling blocked, job held in queue', type: 'warn' });
    } else if (ps === 'invoice_overdue') {
      setTriggerNotice({ msg: 'Invoice Overdue — stop-work triggered, job status set to Failed', type: 'error' });
    } else if ((ps === 'deposit_paid' || ps === 'paid_in_full') && (curPayment === 'deposit_pending' || curPayment === 'invoice_overdue')) {
      setTriggerNotice({ msg: ps === 'paid_in_full' ? 'Paid in Full — all restrictions lifted' : 'Deposit received — scheduling unlocked', type: 'info' });
    }

    setPaymentOverrides((prev) => ({ ...prev, [id]: ps }));
  }

  function onStatusChange(id: string, newStatus: SchedulerStatus) {
    const curPayment = paymentOverrides[id] ?? allJobs.find((j) => j.id === id)?.paymentStatus ?? 'deposit_pending';

    if (newStatus === 'running' && curPayment === 'deposit_pending') {
      setTriggerNotice({ msg: 'Cannot start — deposit is required before this job can run', type: 'error' });
      return;
    }
    if (newStatus === 'running' && curPayment === 'invoice_overdue') {
      setTriggerNotice({ msg: 'Cannot start — stop-work is active (invoice overdue)', type: 'error' });
      return;
    }

    // Cascade: completing a deposit-paid job advances payment to invoice_sent
    if (newStatus === 'completed' && curPayment === 'deposit_paid') {
      setPaymentOverrides((prev) => ({ ...prev, [id]: 'invoice_sent' }));
      setTriggerNotice({ msg: 'Job completed — payment status advanced to Invoice Sent', type: 'info' });
    } else if (newStatus === 'completed' && !triggerNotice) {
      setTriggerNotice({ msg: 'Job marked as Completed', type: 'info' });
    }

    setStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));
  }

  // Auto-dismiss trigger notice after 4 s
  useEffect(() => {
    if (!triggerNotice) return;
    const t = setTimeout(() => setTriggerNotice(null), 4000);
    return () => clearTimeout(t);
  }, [triggerNotice]);

  // Keep selected job in sync when effective state changes
  useEffect(() => {
    if (!selectedJob) return;
    const updated = effectiveJobs.find((j) => j.id === selectedJob.id);
    if (updated && (updated.status !== selectedJob.status || updated.paymentStatus !== selectedJob.paymentStatus)) {
      setSelectedJob(updated);
    }
  }, [effectiveJobs, selectedJob]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setSelectedJob(null); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const stats      = useMemo(() => getSchedulerStats(effectiveJobs), [effectiveJobs]);
  const alertCount = stats.failed + stats.slaAtRisk;

  return (
    <div>
      <StatusCards stats={stats} alertCount={alertCount} />

      {!alertDismissed && <AlertBanner jobs={effectiveJobs} onDismiss={() => setAlertDismissed(true)} />}

      {triggerNotice && (
        <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          triggerNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
          triggerNotice.type === 'warn'  ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                           'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{triggerNotice.msg}</span>
          <button onClick={() => setTriggerNotice(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <SubTabNav active={activeSubTab} onChange={setActiveSubTab} />

      {activeSubTab === 'overview'   && <OverviewTab   jobs={effectiveJobs} onSelectJob={setSelectedJob} />}
      {activeSubTab === 'jobs'       && <JobsTab       jobs={effectiveJobs} onSelectJob={setSelectedJob} onPaymentChange={onPaymentChange} onStatusChange={onStatusChange} />}
      {activeSubTab === 'workflows'  && <WorkflowsTab  jobs={effectiveJobs} onSelectJob={setSelectedJob} />}
      {activeSubTab === 'calendar'   && <CalendarTab   jobs={effectiveJobs} onSelectJob={setSelectedJob} />}
      {activeSubTab === 'analytics'  && <AnalyticsTab  jobs={effectiveJobs} />}

      {selectedJob && (
        <SidePanel
          job={selectedJob}
          jobs={effectiveJobs}
          onClose={() => setSelectedJob(null)}
          onNavigate={setSelectedJob}
          onPaymentChange={onPaymentChange}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}
