'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, X, Bell, Search, Play, RotateCcw, Pause, SkipForward, Edit2,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Copy, Check,
  Zap, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, BarChart3,
  ArrowRight, Activity, Users, MapPin, Tag, Info,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, addDays,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  SCHEDULER_JOBS, SCHEDULER_WORKFLOWS,
  getSchedulerStats, formatDuration, formatRelative, formatRelativeFuture,
  type SchedulerJob, type SchedulerStatus, type ScheduleType, type ServiceType,
} from '@/lib/mock-scheduler-db';

const NOW = new Date('2026-05-05T10:30:00');
const TABLE_PAGE_SIZE = 10;

type SubTab = 'overview' | 'jobs' | 'workflows' | 'calendar' | 'analytics';

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

// ── Utility ─────────────────────────────────────────────────────────────────

function jobById(id: string): SchedulerJob | undefined {
  return SCHEDULER_JOBS.find((j) => j.id === id);
}

function formatTime(date: Date | null): string {
  if (!date) return '—';
  return format(date, 'MMM d, h:mm a');
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
    {
      label: 'Running',
      value: stats.running,
      icon: <Zap className="h-5 w-5 text-teal-600" />,
      bg: 'bg-teal-50',
      pulse: true,
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      pulse: false,
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      bg: 'bg-red-50',
      pulse: false,
    },
    {
      label: 'Queued',
      value: stats.queued,
      icon: <Clock className="h-5 w-5 text-gray-400" />,
      bg: 'bg-gray-50',
      pulse: false,
    },
    {
      label: 'SLA At Risk',
      value: stats.slaAtRisk,
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      bg: 'bg-amber-50',
      pulse: false,
    },
  ];

  return (
    <div className="mb-4 flex items-start gap-4">
      <div className="flex flex-1 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-4"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${c.bg}`}>
              {c.icon}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-gray-900">{c.value}</span>
              {c.pulse && c.value > 0 && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal-400" />
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-gray-400">
              {c.label}
            </p>
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

function AlertBanner({
  jobs,
  onDismiss,
}: {
  jobs: SchedulerJob[];
  onDismiss: () => void;
}) {
  const failed = jobs.filter((j) => j.status === 'failed');
  const sla = jobs.filter((j) => j.status === 'sla_at_risk');

  if (failed.length === 0 && sla.length === 0) return null;

  const isFail = failed.length > 0;
  const critical = isFail ? failed[0] : sla[0];

  return (
    <div
      className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
        isFail
          ? 'border-red-200 bg-red-50'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      <span className={isFail ? 'text-red-700' : 'text-amber-700'}>
        <AlertCircle className="mr-2 inline h-4 w-4" />
        {isFail
          ? `${critical.name} failed ${formatRelative(critical.lastRun)} — ${failed.length} job${failed.length > 1 ? 's' : ''} require attention`
          : `${critical.name} is approaching SLA deadline (${formatRelativeFuture(critical.nextRun)})`}
      </span>
      <div className="flex items-center gap-3">
        <button className={`text-xs underline ${isFail ? 'text-red-600' : 'text-amber-600'}`}>
          View All
        </button>
        <button
          onClick={onDismiss}
          className={`${isFail ? 'text-red-400 hover:text-red-600' : 'text-amber-400 hover:text-amber-600'}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Sub-Tab Nav ───────────────────────────────────────────────────────────────

function SubTabNav({
  active,
  onChange,
}: {
  active: SubTab;
  onChange: (t: SubTab) => void;
}) {
  const tabs: { id: SubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'analytics', label: 'Analytics' },
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

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function GanttTimeline({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  const windowStart = new Date(NOW.getTime() - 12 * 3600_000);
  const windowEnd   = new Date(NOW.getTime() + 6 * 3600_000);
  const windowDur   = windowEnd.getTime() - windowStart.getTime();

  const visibleJobs = SCHEDULER_JOBS.filter((job) => {
    const start = job.status === 'queued' ? job.nextRun : job.lastRun;
    const end = start ? new Date(start.getTime() + job.avgDuration * 60_000) : null;
    if (!start || !end) return false;
    return start < windowEnd && end > windowStart;
  });

  const crewMap = new Map<string, SchedulerJob[]>();
  for (const job of visibleJobs) {
    const primary = job.crew[0] ?? 'Unassigned';
    if (!crewMap.has(primary)) crewMap.set(primary, []);
    crewMap.get(primary)!.push(job);
  }

  const crews = Array.from(crewMap.entries());

  const hourMarkers = Array.from({ length: 19 }, (_, i) => {
    const t = new Date(windowStart.getTime() + i * 3600_000);
    return { label: format(t, 'h a'), pct: (i / 18) * 100 };
  });

  const nowPct = ((NOW.getTime() - windowStart.getTime()) / windowDur) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Timeline — Last 12h / Next 6h
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Hour axis */}
          <div className="relative ml-36 h-7 border-b border-gray-100">
            {hourMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute top-1 -translate-x-1/2 text-[10px] text-gray-400"
                style={{ left: `${m.pct}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Now line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-indigo-400 z-10"
              style={{ left: `calc(9rem + ${nowPct}% * (100% - 9rem) / 100)` }}
            >
              <span className="absolute -top-0 left-1 text-[9px] font-semibold text-indigo-500">NOW</span>
            </div>

            {crews.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No jobs in the current window
              </div>
            ) : (
              crews.map(([crew, jobs]) => (
                <div key={crew} className="flex items-center border-b border-gray-50 last:border-0">
                  <div className="w-36 shrink-0 px-3 py-3 text-xs font-medium text-gray-600 truncate">
                    {crew.split(' ')[0]}
                  </div>
                  <div className="relative flex-1 h-10 pr-2">
                    {jobs.map((job) => {
                      const start = job.status === 'queued' ? job.nextRun! : job.lastRun!;
                      const end = new Date(start.getTime() + job.avgDuration * 60_000);
                      const clampedStart = Math.max(start.getTime(), windowStart.getTime());
                      const clampedEnd = Math.min(end.getTime(), windowEnd.getTime());
                      const leftPct = ((clampedStart - windowStart.getTime()) / windowDur) * 100;
                      const widthPct = ((clampedEnd - clampedStart) / windowDur) * 100;

                      return (
                        <button
                          key={job.id}
                          onClick={() => onSelectJob(job)}
                          title={job.name}
                          className={`absolute top-1.5 h-7 rounded cursor-pointer opacity-90 hover:opacity-100 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-400 transition-all ${STATUS_BAR_COLOR[job.status]}`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${Math.max(widthPct, 1.5)}%`,
                          }}
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

function RecentFailures({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  const failed = SCHEDULER_JOBS.filter((j) => j.status === 'failed');

  const liveEvents = [
    { time: formatTime(new Date(NOW.getTime() - 15 * 60_000)), text: 'Full_Setup_Coral_Springs started', type: 'start' },
    { time: formatTime(new Date(NOW.getTime() - 45 * 60_000)), text: 'Water_Test_Ocean_Dr_Followup started', type: 'start' },
    { time: formatTime(new Date(NOW.getTime() - 60 * 60_000)), text: 'Equipment_Delivery_Ocean_Dr started', type: 'start' },
    { time: formatTime(new Date(NOW.getTime() - 120 * 60_000)), text: 'Emergency_Repair_Palmetto failed', type: 'fail' },
    { time: formatTime(new Date(NOW.getTime() - 240 * 60_000)), text: 'Equipment_Delivery_Palmetto completed', type: 'complete' },
  ];

  return (
    <div className="mt-6 grid grid-cols-5 gap-4">
      <div className="col-span-3">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
          Recent Failures
        </h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {failed.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No recent failures</div>
          ) : (
            failed.slice(0, 5).map((job) => {
              const lastLog = job.runHistory[0]?.log.split('\n').slice(-2, -1)[0] ?? '';
              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectJob(job)}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      {job.name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(job.lastRun)}</span>
                    {lastLog && (
                      <span className="ml-3 text-xs text-red-500 truncate">{lastLog.trim()}</span>
                    )}
                  </div>
                  <button
                    className="ml-4 shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    Retry
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="col-span-2">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
          Live Activity
        </h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {liveEvents.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  ev.type === 'fail' ? 'bg-red-400' : ev.type === 'complete' ? 'bg-emerald-400' : 'bg-teal-400'
                }`}
              />
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

function OverviewTab({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  return (
    <div>
      <GanttTimeline onSelectJob={onSelectJob} />
      <RecentFailures onSelectJob={onSelectJob} />
    </div>
  );
}

// ── Tab 2: Jobs ───────────────────────────────────────────────────────────────

function JobsTab({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchedulerStatus | 'all'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleType | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let jobs = [...SCHEDULER_JOBS];
    if (statusFilter !== 'all') jobs = jobs.filter((j) => j.status === statusFilter);
    if (scheduleFilter !== 'all') jobs = jobs.filter((j) => j.scheduleType === scheduleFilter);
    if (serviceFilter !== 'all') jobs = jobs.filter((j) => j.serviceType === serviceFilter);
    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.crew.some((c) => c.toLowerCase().includes(q)) ||
          j.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    jobs.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortKey === 'name') { av = a.name; bv = b.name; }
      else if (sortKey === 'status') { av = a.status; bv = b.status; }
      else if (sortKey === 'lastRun') { av = a.lastRun?.getTime() ?? 0; bv = b.lastRun?.getTime() ?? 0; }
      else if (sortKey === 'nextRun') { av = a.nextRun?.getTime() ?? 0; bv = b.nextRun?.getTime() ?? 0; }
      else if (sortKey === 'duration') { av = a.avgDuration; bv = b.avgDuration; }
      else if (sortKey === 'successRate') { av = a.successRate; bv = b.successRate; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return jobs;
  }, [search, statusFilter, scheduleFilter, serviceFilter, sortKey, sortDir]);

  const pageCount = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const paged = filtered.slice(page * TABLE_PAGE_SIZE, (page + 1) * TABLE_PAGE_SIZE);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  }

  function SortIndicator({ col }: { col: string }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const selectClasses =
    'rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400';

  return (
    <div>
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
        <select className={selectClasses} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as SchedulerStatus | 'all'); setPage(0); }}>
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
          <option value="sla_at_risk">SLA At Risk</option>
        </select>
        <select className={selectClasses} value={scheduleFilter} onChange={(e) => { setScheduleFilter(e.target.value as ScheduleType | 'all'); setPage(0); }}>
          <option value="all">All Schedule Types</option>
          <option value="recurring">Recurring</option>
          <option value="one_time">One-time</option>
          <option value="event_triggered">Event-triggered</option>
        </select>
        <select className={selectClasses} value={serviceFilter} onChange={(e) => { setServiceFilter(e.target.value as ServiceType | 'all'); setPage(0); }}>
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
              <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Status <SortIndicator col="status" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>Job Name <SortIndicator col="name" /></TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('lastRun')}>Last Run <SortIndicator col="lastRun" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('nextRun')}>Next Run <SortIndicator col="nextRun" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('duration')}>Duration <SortIndicator col="duration" /></TableHead>
              <TableHead>Crew</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((job) => (
              <TableRow
                key={job.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredRow(job.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onSelectJob(job)}
              >
                <TableCell>{statusBadge(job.status)}</TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900 text-sm">
                    {job.name.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-gray-400">{job.id}</span>
                </TableCell>
                <TableCell className="text-xs text-gray-600">{job.schedule}</TableCell>
                <TableCell className="text-xs text-gray-500">{formatRelative(job.lastRun)}</TableCell>
                <TableCell className="text-xs text-gray-500">{formatRelativeFuture(job.nextRun)}</TableCell>
                <TableCell className="text-xs text-gray-500">{formatDuration(job.avgDuration)}</TableCell>
                <TableCell className="text-xs text-gray-600 max-w-[120px] truncate">
                  {job.crew.join(', ')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {job.tags.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {t}
                      </span>
                    ))}
                    {job.tags.length > 2 && (
                      <span className="text-[10px] text-gray-400">+{job.tags.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {hoveredRow === job.id && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Retry</button>
                      <button className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Pause</button>
                      <button className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50">Log</button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            {page * TABLE_PAGE_SIZE + 1}–{Math.min((page + 1) * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-gray-200 px-2.5 py-1 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-200 px-2.5 py-1 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Workflows (DAG) ───────────────────────────────────────────────────

function WorkflowsTab({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  const [selectedWf, setSelectedWf] = useState(SCHEDULER_WORKFLOWS[0].id);
  const workflow = SCHEDULER_WORKFLOWS.find((w) => w.id === selectedWf)!;
  const wfJobs = workflow.jobIds.map((id) => jobById(id)).filter(Boolean) as SchedulerJob[];

  const NODE_W = 180;
  const NODE_H = 52;
  const COL_GAP = 80;
  const ROW_GAP = 28;

  const depthMap = useMemo(() => {
    const depths: Record<string, number> = {};
    function getDepth(id: string): number {
      if (depths[id] !== undefined) return depths[id];
      const job = jobById(id);
      if (!job || job.dependsOn.length === 0) {
        depths[id] = 0;
        return 0;
      }
      const parentDepths = job.dependsOn
        .filter((pid) => workflow.jobIds.includes(pid))
        .map(getDepth);
      depths[id] = parentDepths.length > 0 ? Math.max(...parentDepths) + 1 : 0;
      return depths[id];
    }
    for (const id of workflow.jobIds) getDepth(id);
    return depths;
  }, [workflow]);

  const maxDepth = Math.max(...Object.values(depthMap), 0);
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of workflow.jobIds) {
    const d = depthMap[id] ?? 0;
    layers[d].push(id);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const maxLayerSize = Math.max(...layers.map((l) => l.length));
  for (let col = 0; col <= maxDepth; col++) {
    const layer = layers[col];
    const totalH = layer.length * NODE_H + (layer.length - 1) * ROW_GAP;
    const startY = (maxLayerSize * (NODE_H + ROW_GAP) - totalH) / 2;
    for (let row = 0; row < layer.length; row++) {
      positions[layer[row]] = {
        x: col * (NODE_W + COL_GAP),
        y: startY + row * (NODE_H + ROW_GAP),
      };
    }
  }

  const svgW = (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP + 20;
  const svgH = maxLayerSize * (NODE_H + ROW_GAP) + 20;

  const STATUS_MAP: Record<SchedulerStatus, string> = {
    running: 'teal', completed: 'emerald', failed: 'red', queued: 'gray', sla_at_risk: 'amber',
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedWf}
          onChange={(e) => setSelectedWf(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {SCHEDULER_WORKFLOWS.map((wf) => (
            <option key={wf.id} value={wf.id}>{wf.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{wfJobs.length} jobs in workflow</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 overflow-x-auto">
        <svg width={svgW} height={Math.max(svgH, 120)} className="overflow-visible">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
            </marker>
            <marker id="arrow-critical" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* Edges */}
          {wfJobs.map((job) =>
            job.dependsOn
              .filter((pid) => workflow.jobIds.includes(pid))
              .map((pid) => {
                const from = positions[pid];
                const to = positions[job.id];
                if (!from || !to) return null;
                const isCritical =
                  wfJobs.find((j) => j.id === pid)?.status === 'running' ||
                  wfJobs.find((j) => j.id === pid)?.status === 'sla_at_risk';
                const x1 = from.x + NODE_W + 10;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x - 10;
                const y2 = to.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={`${pid}-${job.id}`}
                    d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none"
                    stroke={isCritical ? '#6366f1' : '#94a3b8'}
                    strokeWidth={isCritical ? 2 : 1.5}
                    strokeDasharray={isCritical ? undefined : '4 2'}
                    markerEnd={isCritical ? 'url(#arrow-critical)' : 'url(#arrow)'}
                  />
                );
              }),
          )}

          {/* Nodes */}
          {wfJobs.map((job) => {
            const pos = positions[job.id];
            if (!pos) return null;
            const fillColor = STATUS_NODE_FILL[job.status];
            const textColor = STATUS_NODE_TEXT[job.status];
            const label = job.name.replace(/_/g, ' ');
            const words = label.split(' ');
            const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

            return (
              <g
                key={job.id}
                transform={`translate(${pos.x},${pos.y})`}
                className="cursor-pointer"
                onClick={() => onSelectJob(job)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={fillColor}
                  stroke={textColor}
                  strokeWidth={1.5}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={textColor}
                >
                  {line1}
                </text>
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 8}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={textColor}
                >
                  {line2}
                </text>
                <text
                  x={NODE_W / 2}
                  y={NODE_H - 5}
                  textAnchor="middle"
                  fontSize={8}
                  fill={textColor}
                  opacity={0.7}
                >
                  {job.status.replace('_', ' ')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
          {(Object.entries(STATUS_NODE_FILL) as [SchedulerStatus, string][]).map(([status, fill]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm border"
                style={{ backgroundColor: fill, borderColor: STATUS_NODE_TEXT[status] }}
              />
              <span className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg width="24" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#6366f1" strokeWidth="2" /><polygon points="16,2 24,5 16,8" fill="#6366f1" /></svg>
              Critical path
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg width="24" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" /><polygon points="16,2 24,5 16,8" fill="#94a3b8" /></svg>
              Dependency
            </span>
          </div>
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

function isBlackout(date: Date): boolean {
  return BLACKOUT_RANGES.some(
    (r) => date >= r.start && date <= r.end,
  );
}

function jobsForDate(date: Date): SchedulerJob[] {
  return SCHEDULER_JOBS.filter((job) => {
    const checkDate = (d: Date | null) =>
      d && isSameDay(d, date);
    return checkDate(job.lastRun) || checkDate(job.nextRun);
  });
}

function CalendarTab({ onSelectJob }: { onSelectJob: (j: SchedulerJob) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-05-01'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2026-05-05'));

  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const upcomingToday = SCHEDULER_JOBS.filter(
    (j) => j.nextRun && isSameDay(j.nextRun, NOW),
  ).sort((a, b) => (a.nextRun?.getTime() ?? 0) - (b.nextRun?.getTime() ?? 0));

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        {/* Calendar header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <h3 className="text-sm font-semibold text-gray-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium uppercase text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
          {days.map((day) => {
            const dayJobs = jobsForDate(day);
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, NOW);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const blackout = isBlackout(day);

            return (
              <div
                key={day.toISOString()}
                className={`bg-white p-1.5 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${
                  !inMonth ? 'opacity-40' : ''
                } ${isSelected ? 'ring-2 ring-inset ring-indigo-400' : ''} ${blackout ? 'bg-gray-50' : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : day)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]'
                        : 'text-gray-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {blackout && (
                    <span className="text-[9px] text-gray-400 italic">blocked</span>
                  )}
                </div>
                {blackout && (
                  <div className="mt-1 rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-400 truncate">
                    {BLACKOUT_RANGES.find((r) => day >= r.start && day <= r.end)?.label}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayJobs.slice(0, 3).map((job) => (
                    <span
                      key={job.id}
                      className={`inline-block h-2 w-2 rounded-full ${
                        job.status === 'completed' ? 'bg-emerald-400' :
                        job.status === 'running' ? 'bg-teal-400' :
                        job.status === 'failed' ? 'bg-red-400' :
                        job.status === 'sla_at_risk' ? 'bg-amber-400' : 'bg-gray-300'
                      }`}
                      title={job.name.replace(/_/g, ' ')}
                    />
                  ))}
                  {dayJobs.length > 3 && (
                    <span className="text-[9px] text-gray-400">+{dayJobs.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded day view */}
        {selectedDate && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h4>
            {jobsForDate(selectedDate).length === 0 ? (
              <p className="text-xs text-gray-400">No jobs scheduled for this day</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {jobsForDate(selectedDate).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-1"
                    onClick={() => onSelectJob(job)}
                  >
                    <div className="flex items-center gap-3">
                      {statusBadge(job.status)}
                      <span className="text-sm font-medium text-gray-800">
                        {job.name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {job.lastRun && isSameDay(job.lastRun, selectedDate)
                        ? format(job.lastRun, 'h:mm a')
                        : job.nextRun && isSameDay(job.nextRun, selectedDate)
                        ? format(job.nextRun, 'h:mm a')
                        : '—'}
                      {' · '}
                      {formatDuration(job.avgDuration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Today sidebar */}
      <div className="w-52 shrink-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
          Upcoming Today
        </h3>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {upcomingToday.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">No upcoming jobs</div>
          ) : (
            upcomingToday.slice(0, 10).map((job) => (
              <div
                key={job.id}
                className="px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectJob(job)}
              >
                <p className="text-xs font-medium text-gray-800 truncate">
                  {job.name.replace(/_/g, ' ')}
                </p>
                <p className="text-[10px] text-gray-400">
                  {job.nextRun ? format(job.nextRun, 'h:mm a') : '—'} · {job.serviceType}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Analytics ──────────────────────────────────────────────────────────

const CREW_MEMBERS = [
  'Marcus Rivera', 'Priya Nair', 'Devon Chang',
  'Trent Wallace', 'Aisha Thompson', 'Keisha Fontaine', "Liam O'Brien",
];

function crewStatus(name: string): { status: 'available' | 'busy' | 'offline'; currentJob: string | null; utilization: number } {
  const runningJob = SCHEDULER_JOBS.find(
    (j) => j.status === 'running' && j.crew.includes(name),
  );
  if (runningJob) {
    return { status: 'busy', currentJob: runningJob.name.replace(/_/g, ' '), utilization: 85 };
  }
  const offline = ["Liam O'Brien"];
  if (offline.includes(name)) {
    return { status: 'offline', currentJob: null, utilization: 0 };
  }
  const utils: Record<string, number> = {
    'Marcus Rivera': 72, 'Priya Nair': 68, 'Devon Chang': 45,
    'Trent Wallace': 90, 'Aisha Thompson': 55, 'Keisha Fontaine': 60,
  };
  return { status: 'available', currentJob: null, utilization: utils[name] ?? 50 };
}

function generate30DayData() {
  return Array.from({ length: 30 }, (_, i) => {
    const date = format(new Date(NOW.getTime() - (29 - i) * 24 * 3600_000), 'MMM d');
    const success = Math.round(8 + Math.random() * 6);
    const failed = Math.round(Math.random() * 3);
    return { date, success, failed };
  });
}

function generateDurationByType() {
  const types = ['Install', 'Maint', 'Water Test', 'Delivery', 'Emergency', 'Deep Clean'];
  const avgs = [210, 62, 25, 88, 83, 120];
  return types.map((name, i) => ({
    name,
    avgDuration: Math.round(avgs[i] * (0.85 + Math.random() * 0.3)),
  }));
}

const trend30 = generate30DayData();
const durationByType = generateDurationByType();
const historicalAvgDuration = Math.round(
  durationByType.reduce((s, d) => s + d.avgDuration, 0) / durationByType.length,
);

function AnalyticsTab() {
  const totalJobs = SCHEDULER_JOBS.length;
  const allRuns = SCHEDULER_JOBS.flatMap((j) => j.runHistory);
  const completedRuns = allRuns.filter((r) => r.status === 'completed').length;
  const successRate = allRuns.length > 0 ? Math.round((completedRuns / allRuns.length) * 100) : 0;
  const avgDur = Math.round(SCHEDULER_JOBS.reduce((s, j) => s + j.avgDuration, 0) / totalJobs);
  const slaCompliance = Math.round(
    (SCHEDULER_JOBS.filter((j) => j.status !== 'failed' && j.status !== 'sla_at_risk').length / totalJobs) * 100,
  );

  const kpis = [
    { label: 'Success Rate', value: `${successRate}%`, trend: 'up', change: '+2.1%' },
    { label: 'Avg Job Duration', value: formatDuration(avgDur), trend: 'down', change: '-8m' },
    { label: 'SLA Compliance', value: `${slaCompliance}%`, trend: 'up', change: '+1.5%' },
    { label: 'Total Jobs (30d)', value: String(totalJobs), trend: 'up', change: '+3' },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{k.value}</p>
            <div
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                k.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {k.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {k.change} vs last month
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Success vs failure trend */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
            Success vs Failure — 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend30} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Success" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Avg duration by type */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
            Avg Duration by Service Type (min)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationByType} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v}m`, 'Avg Duration']} />
              <Bar dataKey="avgDuration" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Duration" />
              <ReferenceLine y={historicalAvgDuration} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Avg', fontSize: 9, fill: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crew utilization */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Crew / Resource Status
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {CREW_MEMBERS.map((name) => {
            const info = crewStatus(name);
            return (
              <div key={name} className="flex items-center gap-4 px-4 py-3">
                <div className="w-32 shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        info.status === 'busy' ? 'bg-amber-400' :
                        info.status === 'available' ? 'bg-emerald-400' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                  </div>
                </div>
                <Badge
                  className={`shrink-0 border-0 capitalize ${
                    info.status === 'busy' ? 'bg-amber-100 text-amber-700' :
                    info.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
                >
                  {info.status}
                </Badge>
                <span className="flex-1 text-xs text-gray-500 truncate min-w-0">
                  {info.currentJob ?? '—'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-2 w-24 rounded-full bg-indigo-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${info.utilization}%` }}
                    />
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

function SidePanel({
  job,
  onClose,
  onNavigate,
}: {
  job: SchedulerJob;
  onClose: () => void;
  onNavigate: (j: SchedulerJob) => void;
}) {
  const [logCopied, setLogCopied] = useState(false);
  const lastLog = job.runHistory[0]?.log ?? 'No log available.';

  function copyLog() {
    navigator.clipboard.writeText(lastLog).then(() => {
      setLogCopied(true);
      setTimeout(() => setLogCopied(false), 1500);
    });
  }

  const deps = job.dependsOn.map(jobById).filter(Boolean) as SchedulerJob[];
  const dependents = SCHEDULER_JOBS.filter((j) => j.dependsOn.includes(job.id));

  const sparkData = job.runHistory.slice(0, 8).reverse().map((r, i) => ({
    i,
    dur: r.status === 'failed' ? 0 : r.duration,
  }));

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[40%] min-w-[360px] max-w-[600px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-gray-900 truncate">
                  {job.name.replace(/_/g, ' ')}
                </h2>
                {statusBadge(job.status)}
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-gray-400">{job.id}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 hover:bg-gray-100 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(['Run Now', 'Retry', job.status === 'running' ? 'Pause' : 'Resume', 'Skip', 'Edit Schedule'] as const).map((action) => (
              <button
                key={action}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {action === 'Run Now' && <Play className="h-3 w-3" />}
                {action === 'Retry' && <RotateCcw className="h-3 w-3" />}
                {(action === 'Pause' || action === 'Resume') && <Pause className="h-3 w-3" />}
                {action === 'Skip' && <SkipForward className="h-3 w-3" />}
                {action === 'Edit Schedule' && <Edit2 className="h-3 w-3" />}
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info */}
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
              Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                { icon: <Info className="h-3 w-3" />, label: 'Service', value: job.serviceType },
                { icon: <Calendar className="h-3 w-3" />, label: 'Schedule', value: job.schedule },
                { icon: <MapPin className="h-3 w-3" />, label: 'Location', value: job.location },
                { icon: <Users className="h-3 w-3" />, label: 'Crew', value: job.crew.join(', ') },
                { icon: <Clock className="h-3 w-3" />, label: 'Avg Duration', value: formatDuration(job.avgDuration) },
                { icon: <Activity className="h-3 w-3" />, label: 'Success Rate', value: `${job.successRate}%` },
                { icon: <Tag className="h-3 w-3" />, label: 'Tags', value: job.tags.join(', ') },
                { icon: <Clock className="h-3 w-3" />, label: 'Created', value: formatTime(job.createdAt) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="col-span-1">
                  <dt className="flex items-center gap-1 font-medium text-gray-400 mb-0.5">{icon}{label}</dt>
                  <dd className="text-gray-700 truncate" title={value}>{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Run history */}
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
              Run History (last {Math.min(job.runHistory.length, 10)})
            </h3>
            {job.runHistory.length === 0 ? (
              <p className="text-xs text-gray-400">No runs yet</p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {job.runHistory.slice(0, 10).map((run, i) => (
                  <div key={run.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        run.status === 'completed' ? 'bg-emerald-400' :
                        run.status === 'failed' ? 'bg-red-400' : 'bg-teal-400'
                      }`}
                    />
                    <span className="flex-1 text-gray-500 truncate">{formatTime(run.startTime)}</span>
                    <span className="text-gray-500">{run.status === 'failed' ? '—' : formatDuration(run.duration)}</span>
                    <span
                      className={`font-medium capitalize ${
                        run.status === 'completed' ? 'text-emerald-600' :
                        run.status === 'failed' ? 'text-red-500' : 'text-teal-600'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Sparkline */}
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

          {/* Log viewer */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Latest Log
              </h3>
              <button
                onClick={copyLog}
                className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
              >
                {logCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {logCopied ? 'Copied!' : 'Copy Log'}
              </button>
            </div>
            <pre className="max-h-40 overflow-y-auto rounded-lg bg-gray-900 p-3 font-mono text-[10px] leading-relaxed text-gray-200 whitespace-pre-wrap">
              {lastLog}
            </pre>
          </div>

          {/* Dependencies */}
          {(deps.length > 0 || dependents.length > 0) && (
            <div className="px-6 py-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-400">
                Dependencies
              </h3>
              {deps.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-400 mb-1.5">Upstream (requires)</p>
                  {deps.map((dep) => (
                    <button
                      key={dep.id}
                      className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => onNavigate(dep)}
                    >
                      {statusBadge(dep.status)}
                      <span className="flex-1 text-xs font-medium text-gray-700 truncate">
                        {dep.name.replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
              {dependents.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-gray-400 mb-1.5">Downstream (blocks)</p>
                  {dependents.map((dep) => (
                    <button
                      key={dep.id}
                      className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => onNavigate(dep)}
                    >
                      {statusBadge(dep.status)}
                      <span className="flex-1 text-xs font-medium text-gray-700 truncate">
                        {dep.name.replace(/_/g, ' ')}
                      </span>
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
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [selectedJob, setSelectedJob] = useState<SchedulerJob | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const stats = useMemo(() => getSchedulerStats(SCHEDULER_JOBS), []);
  const alertCount = stats.failed + stats.slaAtRisk;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedJob(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div>
      <StatusCards stats={stats} alertCount={alertCount} />

      {!alertDismissed && (
        <AlertBanner
          jobs={SCHEDULER_JOBS}
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      <SubTabNav active={activeSubTab} onChange={setActiveSubTab} />

      {activeSubTab === 'overview' && (
        <OverviewTab onSelectJob={setSelectedJob} />
      )}
      {activeSubTab === 'jobs' && (
        <JobsTab onSelectJob={setSelectedJob} />
      )}
      {activeSubTab === 'workflows' && (
        <WorkflowsTab onSelectJob={setSelectedJob} />
      )}
      {activeSubTab === 'calendar' && (
        <CalendarTab onSelectJob={setSelectedJob} />
      )}
      {activeSubTab === 'analytics' && (
        <AnalyticsTab />
      )}

      {selectedJob && (
        <SidePanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onNavigate={(j) => setSelectedJob(j)}
        />
      )}
    </div>
  );
}
