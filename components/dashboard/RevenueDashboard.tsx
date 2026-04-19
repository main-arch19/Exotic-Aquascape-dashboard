'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  LineChart, Line, Legend, PieChart, Pie,
} from 'recharts';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import {
  ALL_TRANSACTIONS, PARISHES, offsetYearMonth, sumNetRevForParishMonth, getLatestYearMonth,
} from '@/lib/mock-revenue-db';
import type { Parish, SalesChannel, Transaction } from '@/lib/mock-revenue-db';

// ─── Types ────────────────────────────────────────────────────────────────────

type DatePreset = 'MTD' | 'QTD' | 'YTD' | 'L12M' | 'CUSTOM';
type TxTypeFilter = 'ALL' | 'SALE' | 'REFUND';

interface ParishRow {
  parish: Parish;
  totalNetRevenue: number;
  transactionCount: number;
  refundAmount: number;
  refundCount: number;
  refundRate: number;
  aov: number;
  revenueShare: number;
  mom: number | null;
  yoy: number | null;
  byChannel: Record<SalesChannel, number>;
}

interface KPISummary {
  totalNetRevenue: number;
  totalTransactions: number;
  aov: number;
  refundRate: number;
  activeParishes: number;
  avgRevenuePerParish: number;
  topParish: string;
  topParishRevenue: number;
  fastestParish: string;
  fastestMoM: number | null;
  worstParish: string;
  worstMoM: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-04-19');

function formatJMD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatPercent(n: number | null, decimals = 1): string {
  if (n === null) return '—';
  return `${n.toFixed(decimals)}%`;
}

function trendColor(n: number | null, inverse = false): string {
  if (n === null) return 'text-gray-400';
  const positive = inverse ? n < 0 : n > 0;
  return positive ? 'text-emerald-600' : 'text-red-500';
}

function trendLabel(n: number | null, inverse = false): string {
  if (n === null) return '—';
  const arrow = n > 0 ? '↑' : '↓';
  const cls = trendColor(n, inverse);
  return `${arrow}${Math.abs(n).toFixed(1)}%`;
  void cls;
}

function presetToRange(preset: DatePreset, custom: { from: string; to: string }): { from: Date; to: Date } {
  const to = new Date(TODAY);
  if (preset === 'MTD') return { from: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), to };
  if (preset === 'QTD') {
    const q = Math.floor(TODAY.getMonth() / 3);
    return { from: new Date(TODAY.getFullYear(), q * 3, 1), to };
  }
  if (preset === 'YTD') return { from: new Date(TODAY.getFullYear(), 0, 1), to };
  if (preset === 'L12M') return { from: new Date(TODAY.getFullYear() - 1, TODAY.getMonth(), TODAY.getDate()), to };
  if (preset === 'CUSTOM' && custom.from && custom.to) {
    return { from: new Date(custom.from), to: new Date(custom.to) };
  }
  return { from: new Date(TODAY.getFullYear() - 1, TODAY.getMonth(), TODAY.getDate()), to };
}

function computeParishRows(filtered: Transaction[]): ParishRow[] {
  const grandTotal = filtered.filter(t => t.type === 'SALE').reduce((s, t) => s + t.netAmount, 0);
  const latestYM = getLatestYearMonth(filtered);

  return PARISHES.map(parish => {
    const pf = filtered.filter(t => t.parish === parish);
    const sales = pf.filter(t => t.type === 'SALE');
    const refunds = pf.filter(t => t.type === 'REFUND');
    const totalNetRevenue = sales.reduce((s, t) => s + t.netAmount, 0);
    const transactionCount = sales.length;
    const refundAmount = refunds.reduce((s, t) => s + t.grossAmount, 0);
    const refundCount = refunds.length;
    const refundRate = transactionCount > 0 ? (refundCount / transactionCount) * 100 : 0;
    const aov = transactionCount > 0 ? totalNetRevenue / transactionCount : 0;
    const revenueShare = grandTotal > 0 ? (totalNetRevenue / grandTotal) * 100 : 0;

    const priorYM = offsetYearMonth(latestYM, -1);
    const currentMonthRev = sumNetRevForParishMonth(ALL_TRANSACTIONS, parish, latestYM);
    const priorMonthRev = sumNetRevForParishMonth(ALL_TRANSACTIONS, parish, priorYM);
    const mom = priorMonthRev > 0 ? ((currentMonthRev - priorMonthRev) / priorMonthRev) * 100 : null;

    const priorYearYM = offsetYearMonth(latestYM, -12);
    const priorYearRev = sumNetRevForParishMonth(ALL_TRANSACTIONS, parish, priorYearYM);
    const yoy = priorYearRev > 0 ? ((currentMonthRev - priorYearRev) / priorYearRev) * 100 : null;

    const byChannel: Record<SalesChannel, number> = { 'IN-STORE': 0, ONLINE: 0, AGENT: 0, B2B: 0 };
    for (const t of sales) byChannel[t.channel] += t.netAmount;

    return { parish, totalNetRevenue, transactionCount, refundAmount, refundCount, refundRate, aov, revenueShare, mom, yoy, byChannel };
  });
}

function computeKPIs(filtered: Transaction[], rows: ParishRow[]): KPISummary {
  const sales = filtered.filter(t => t.type === 'SALE');
  const refunds = filtered.filter(t => t.type === 'REFUND');
  const totalNetRevenue = sales.reduce((s, t) => s + t.netAmount, 0);
  const totalTransactions = sales.length;
  const aov = totalTransactions > 0 ? totalNetRevenue / totalTransactions : 0;
  const totalRefunds = refunds.reduce((s, t) => s + t.grossAmount, 0);
  const refundRate = totalNetRevenue > 0 ? (totalRefunds / totalNetRevenue) * 100 : 0;
  const activeParishes = rows.filter(r => r.totalNetRevenue > 0).length;
  const avgRevenuePerParish = activeParishes > 0 ? totalNetRevenue / activeParishes : 0;

  const sorted = [...rows].sort((a, b) => b.totalNetRevenue - a.totalNetRevenue);
  const topParish = sorted[0]?.parish ?? '—';
  const topParishRevenue = sorted[0]?.totalNetRevenue ?? 0;

  const withMoM = rows.filter(r => r.mom !== null);
  const fastest = withMoM.length ? withMoM.reduce((a, b) => (b.mom! > a.mom! ? b : a)) : null;
  const worst = withMoM.length ? withMoM.reduce((a, b) => (b.mom! < a.mom! ? b : a)) : null;

  return {
    totalNetRevenue, totalTransactions, aov, refundRate, activeParishes, avgRevenuePerParish,
    topParish, topParishRevenue,
    fastestParish: fastest?.parish ?? '—', fastestMoM: fastest?.mom ?? null,
    worstParish: worst?.parish ?? '—', worstMoM: worst?.mom ?? null,
  };
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const LINE_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];
const CHANNEL_COLORS: Record<SalesChannel, string> = {
  'IN-STORE': '#6366f1', ONLINE: '#0ea5e9', AGENT: '#f59e0b', B2B: '#10b981',
};

// ─── GlobalFilters ────────────────────────────────────────────────────────────

interface FiltersProps {
  datePreset: DatePreset;
  setDatePreset: (p: DatePreset) => void;
  customRange: { from: string; to: string };
  setCustomRange: (r: { from: string; to: string }) => void;
  selectedParishes: Parish[];
  setSelectedParishes: (p: Parish[]) => void;
  selectedChannels: SalesChannel[];
  setSelectedChannels: (c: SalesChannel[]) => void;
  txType: TxTypeFilter;
  setTxType: (t: TxTypeFilter) => void;
  onReset: () => void;
  isDirty: boolean;
}

function GlobalFilters({
  datePreset, setDatePreset, customRange, setCustomRange,
  selectedParishes, setSelectedParishes, selectedChannels, setSelectedChannels,
  txType, setTxType, onReset, isDirty,
}: FiltersProps) {
  const [parishOpen, setParishOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  const PRESETS: DatePreset[] = ['MTD', 'QTD', 'YTD', 'L12M', 'CUSTOM'];
  const CHANNELS: SalesChannel[] = ['IN-STORE', 'ONLINE', 'AGENT', 'B2B'];

  function toggleParish(p: Parish) {
    setSelectedParishes(
      selectedParishes.includes(p)
        ? selectedParishes.filter(x => x !== p)
        : [...selectedParishes, p]
    );
  }

  function toggleChannel(c: SalesChannel) {
    setSelectedChannels(
      selectedChannels.includes(c)
        ? selectedChannels.filter(x => x !== c)
        : [...selectedChannels, c]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 border-b border-gray-100">
      {/* Date presets */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setDatePreset(p)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              datePreset === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {datePreset === 'CUSTOM' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customRange.from}
            onChange={e => setCustomRange({ ...customRange, from: e.target.value })}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={e => setCustomRange({ ...customRange, to: e.target.value })}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
          />
        </div>
      )}

      {/* Parish multi-select */}
      <div className="relative">
        <button
          onClick={() => { setParishOpen(o => !o); setChannelOpen(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          Parish
          {selectedParishes.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 text-xs">{selectedParishes.length}</span>
          )}
          {parishOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
        </button>
        {parishOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[180px] max-h-56 overflow-y-auto">
            {PARISHES.map(p => (
              <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedParishes.includes(p)}
                  onChange={() => toggleParish(p)}
                  className="accent-indigo-600"
                />
                <span className="text-xs text-gray-700">{p}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Channel multi-select */}
      <div className="relative">
        <button
          onClick={() => { setChannelOpen(o => !o); setParishOpen(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          Channel
          {selectedChannels.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 text-xs">{selectedChannels.length}</span>
          )}
          {channelOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
        </button>
        {channelOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[160px]">
            {CHANNELS.map(c => (
              <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(c)}
                  onChange={() => toggleChannel(c)}
                  className="accent-indigo-600"
                />
                <span className="text-xs text-gray-700">{c}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Tx type toggle */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
        {(['ALL', 'SALE', 'REFUND'] as TxTypeFilter[]).map(t => (
          <button
            key={t}
            onClick={() => setTxType(t)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              txType === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'ALL' ? 'All' : t === 'SALE' ? 'Sales' : 'Refunds'}
          </button>
        ))}
      </div>

      {isDirty && (
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg bg-white hover:bg-red-50 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Tier 1 KPI Cards ─────────────────────────────────────────────────────────

function KPICard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
      {sub && <p className={`text-xs mt-1.5 font-medium ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

function Tier1KPIs({ kpis }: { kpis: KPISummary }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Total Net Revenue" value={formatJMD(kpis.totalNetRevenue)} />
        <KPICard label="Total Transactions" value={formatCount(kpis.totalTransactions)} />
        <KPICard label="Avg Order Value" value={formatJMD(kpis.aov)} />
        <KPICard
          label="Refund Rate"
          value={formatPercent(kpis.refundRate)}
          sub={kpis.refundRate > 5 ? '↑ High' : '↓ Healthy'}
          subColor={kpis.refundRate > 5 ? 'text-red-500' : 'text-emerald-600'}
        />
        <KPICard label="Active Parishes" value={`${kpis.activeParishes} / 14`} />
        <KPICard label="Avg Rev / Parish" value={formatJMD(kpis.avgRevenuePerParish)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          🏆 Top Parish: {kpis.topParish} — {formatJMD(kpis.topParishRevenue)}
        </span>
        {kpis.fastestMoM !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            📈 Fastest Growing: {kpis.fastestParish} — +{kpis.fastestMoM.toFixed(1)}% MoM
          </span>
        )}
        {kpis.worstMoM !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            ⚠️ Underperforming: {kpis.worstParish} — {kpis.worstMoM.toFixed(1)}% MoM
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Parish Bar Chart ─────────────────────────────────────────────────────────

interface BarTooltipProps { active?: boolean; payload?: { value: number }[]; label?: string }
function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{label}</p>
      <p className="text-indigo-600 mt-0.5">{formatJMD(payload[0].value)}</p>
    </div>
  );
}

function ParishBarChart({ rows }: { rows: ParishRow[] }) {
  const data = [...rows]
    .sort((a, b) => b.totalNetRevenue - a.totalNetRevenue)
    .map(r => ({
      parish: r.parish,
      revenue: r.totalNetRevenue,
      mom: r.mom !== null ? `${r.mom > 0 ? '+' : ''}${r.mom.toFixed(1)}%` : '',
      momColor: r.mom === null ? '#9ca3af' : r.mom >= 0 ? '#10b981' : '#ef4444',
    }));

  if (!data.some(d => d.revenue > 0)) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">No data for selected period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
        <XAxis type="number" tickFormatter={formatJMD} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="parish" width={105} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`hsl(${239 - i * 10}, ${80 - i * 2}%, ${50 + i * 2}%)`} />
          ))}
          <LabelList
            dataKey="mom"
            position="right"
            style={{ fontSize: 10 }}
            formatter={(v: string, _: unknown, index: number) => v}
            content={(props) => {
              const { x, y, width, height, value, index } = props as {
                x: number; y: number; width: number; height: number; value: string; index: number;
              };
              if (!value) return null;
              const color = data[index]?.momColor ?? '#9ca3af';
              return (
                <text x={(x as number) + (width as number) + 6} y={(y as number) + (height as number) / 2 + 4} fill={color} fontSize={10} fontWeight={600}>
                  {value}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Revenue Trend Chart ──────────────────────────────────────────────────────

function RevenueTrendChart({ filtered, trendParishes, setTrendParishes }: {
  filtered: Transaction[];
  trendParishes: Parish[];
  setTrendParishes: (p: Parish[]) => void;
}) {
  // Build monthly buckets
  const monthlyData = useMemo(() => {
    const map: Record<string, Record<Parish, number>> = {};
    for (const t of filtered) {
      if (t.type !== 'SALE') continue;
      const ym = t.date.slice(0, 7);
      if (!map[ym]) map[ym] = {} as Record<Parish, number>;
      map[ym][t.parish] = (map[ym][t.parish] ?? 0) + t.netAmount;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, values]) => {
        const [y, m] = ym.split('-');
        const label = new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        return { ym, label, ...values };
      });
  }, [filtered]);

  function toggleTrendParish(p: Parish) {
    if (trendParishes.includes(p)) {
      if (trendParishes.length === 1) return;
      setTrendParishes(trendParishes.filter(x => x !== p));
    } else {
      if (trendParishes.length >= 4) return;
      setTrendParishes([...trendParishes, p]);
    }
  }

  if (!monthlyData.length) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">No data for selected period</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PARISHES.map((p, i) => {
          const colorIdx = trendParishes.indexOf(p);
          const selected = colorIdx !== -1;
          const color = selected ? LINE_COLORS[colorIdx] : undefined;
          return (
            <button
              key={p}
              onClick={() => toggleTrendParish(p)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                selected ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={selected ? { backgroundColor: color, borderColor: color } : {}}
            >
              {p}
            </button>
          );
        })}
        <span className="text-xs text-gray-400 self-center ml-1">Select up to 4</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={monthlyData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={formatJMD} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
          <Tooltip
            formatter={(v: number) => [formatJMD(v), '']}
            contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {trendParishes.map((p, i) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={LINE_COLORS[i]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={p}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Channel Donut Chart ──────────────────────────────────────────────────────

function ChannelDonutChart({ rows }: { rows: ParishRow[] }) {
  const data = useMemo(() => {
    const totals: Record<string, number> = { 'IN-STORE': 0, ONLINE: 0, AGENT: 0, B2B: 0 };
    for (const r of rows) {
      for (const [ch, v] of Object.entries(r.byChannel)) totals[ch] += v;
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">No data for selected period</div>;
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name as SalesChannel] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [formatJMD(v), '']}
            contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs text-gray-400 font-medium">Total</span>
        <span className="text-base font-bold text-gray-900">{formatJMD(total)}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[d.name as SalesChannel] }} />
            <span className="text-xs text-gray-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Parish Heatmap Table ─────────────────────────────────────────────────────

function ParishHeatmapTable({ rows }: { rows: ParishRow[] }) {
  const sorted = [...rows].sort((a, b) => b.totalNetRevenue - a.totalNetRevenue);
  const maxShare = Math.max(...sorted.map(r => r.revenueShare), 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Parish</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Net Revenue</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Revenue Share</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">MoM</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const intensity = maxShare > 0 ? r.revenueShare / maxShare : 0;
            const darkText = intensity > 0.55;
            return (
              <tr key={r.parish} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800">{r.parish}</td>
                <td className="px-3 py-2 text-right text-gray-700">{formatJMD(r.totalNetRevenue)}</td>
                <td
                  className="px-3 py-2 text-right font-semibold rounded"
                  style={{
                    backgroundColor: `rgba(99,102,241,${intensity * 0.7})`,
                    color: darkText ? '#fff' : '#374151',
                  }}
                >
                  {formatPercent(r.revenueShare)}
                </td>
                <td className={`px-3 py-2 text-right font-medium ${trendColor(r.mom)}`}>
                  {r.mom !== null ? trendLabel(r.mom) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Parish Performance Matrix (Tier 3) ───────────────────────────────────────

type SortCol = keyof Omit<ParishRow, 'parish' | 'byChannel'>;

function ParishMatrix({ rows }: { rows: ParishRow[] }) {
  const [sortCol, setSortCol] = useState<SortCol>('totalNetRevenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? -Infinity;
      const bv = b[sortCol] ?? -Infinity;
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [rows, sortCol, sortDir]);

  const totals = useMemo(() => ({
    totalNetRevenue: rows.reduce((s, r) => s + r.totalNetRevenue, 0),
    transactionCount: rows.reduce((s, r) => s + r.transactionCount, 0),
    refundAmount: rows.reduce((s, r) => s + r.refundAmount, 0),
  }), [rows]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function SortTh({ col, label, right }: { col: SortCol; label: string; right?: boolean }) {
    return (
      <th
        className={`px-3 py-2.5 ${right ? 'text-right' : 'text-left'} font-semibold text-gray-600 cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap`}
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`h-3 w-3 ${sortCol === col ? 'text-indigo-600' : 'text-gray-300'}`} />
        </span>
      </th>
    );
  }

  function GrowthCell({ v }: { v: number | null }) {
    if (v === null) return <td className="px-3 py-2 text-right text-gray-300 text-xs">—</td>;
    const pos = v >= 0;
    return (
      <td className={`px-3 py-2 text-right text-xs font-semibold ${pos ? 'text-emerald-700' : 'text-red-600'}`}>
        <span className={`inline-block px-1.5 py-0.5 rounded ${pos ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {v > 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      </td>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Parish</th>
            <SortTh col="totalNetRevenue" label="Net Revenue" right />
            <SortTh col="transactionCount" label="Transactions" right />
            <SortTh col="aov" label="AOV" right />
            <SortTh col="refundAmount" label="Refund Amt" right />
            <SortTh col="refundRate" label="Refund Rate" right />
            <SortTh col="revenueShare" label="Share %" right />
            <SortTh col="mom" label="MoM %" right />
            <SortTh col="yoy" label="YoY %" right />
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.parish} className="border-b border-gray-100 last:border-0 hover:bg-indigo-50/30">
              <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.parish}</td>
              <td className="px-3 py-2 text-right text-gray-700">{formatJMD(r.totalNetRevenue)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{formatCount(r.transactionCount)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{formatJMD(r.aov)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{formatJMD(r.refundAmount)}</td>
              <td className={`px-3 py-2 text-right font-medium ${r.refundRate > 10 ? 'text-red-600' : r.refundRate > 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                {formatPercent(r.refundRate)}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">{formatPercent(r.revenueShare)}</td>
              <GrowthCell v={r.mom} />
              <GrowthCell v={r.yoy} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
            <td className="px-3 py-2 text-gray-800">National Total</td>
            <td className="px-3 py-2 text-right text-gray-800">{formatJMD(totals.totalNetRevenue)}</td>
            <td className="px-3 py-2 text-right text-gray-800">{formatCount(totals.transactionCount)}</td>
            <td className="px-3 py-2 text-right text-gray-500">—</td>
            <td className="px-3 py-2 text-right text-gray-800">{formatJMD(totals.refundAmount)}</td>
            <td className="px-3 py-2 text-right text-gray-500">—</td>
            <td className="px-3 py-2 text-right text-gray-800">100%</td>
            <td className="px-3 py-2 text-right text-gray-500">—</td>
            <td className="px-3 py-2 text-right text-gray-500">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Transaction Detail (Tier 3) ──────────────────────────────────────────────

function TransactionDetail({ filtered }: { filtered: Transaction[] }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const from = sorted.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, sorted.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing <span className="font-medium text-gray-700">{from}–{to}</span> of <span className="font-medium text-gray-700">{formatCount(sorted.length)}</span> transactions
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {slice.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">No transactions match the current filters</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Date</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Parish</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Channel</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Type</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Gross</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Refund</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Net</th>
              </tr>
            </thead>
            <tbody>
              {slice.map(t => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{t.date}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{t.parish}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{t.channel}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${t.type === 'SALE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatJMD(t.grossAmount)}</td>
                  <td className="px-3 py-2 text-right text-red-500">{t.refundAmount > 0 ? formatJMD(t.refundAmount) : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatJMD(t.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
  );
}

// ─── RevenueDashboard (root) ──────────────────────────────────────────────────

export function RevenueDashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>('YTD');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [selectedParishes, setSelectedParishes] = useState<Parish[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<SalesChannel[]>([]);
  const [txType, setTxType] = useState<TxTypeFilter>('ALL');
  const [trendParishes, setTrendParishes] = useState<Parish[]>(['Kingston', 'St. Andrew']);

  const isDirty =
    datePreset !== 'YTD' ||
    selectedParishes.length > 0 ||
    selectedChannels.length > 0 ||
    txType !== 'ALL';

  function handleReset() {
    setDatePreset('YTD');
    setCustomRange({ from: '', to: '' });
    setSelectedParishes([]);
    setSelectedChannels([]);
    setTxType('ALL');
  }

  const filteredTransactions = useMemo(() => {
    const { from, to } = presetToRange(datePreset, customRange);
    return ALL_TRANSACTIONS.filter(t => {
      const d = new Date(t.date);
      if (d < from || d > to) return false;
      if (selectedParishes.length > 0 && !selectedParishes.includes(t.parish)) return false;
      if (selectedChannels.length > 0 && !selectedChannels.includes(t.channel)) return false;
      if (txType === 'SALE' && t.type !== 'SALE') return false;
      if (txType === 'REFUND' && t.type !== 'REFUND') return false;
      return true;
    });
  }, [datePreset, customRange, selectedParishes, selectedChannels, txType]);

  const parishRows = useMemo(() => computeParishRows(filteredTransactions), [filteredTransactions]);
  const kpis = useMemo(() => computeKPIs(filteredTransactions, parishRows), [filteredTransactions, parishRows]);

  return (
    <div>
      <GlobalFilters
        datePreset={datePreset} setDatePreset={setDatePreset}
        customRange={customRange} setCustomRange={setCustomRange}
        selectedParishes={selectedParishes} setSelectedParishes={setSelectedParishes}
        selectedChannels={selectedChannels} setSelectedChannels={setSelectedChannels}
        txType={txType} setTxType={setTxType}
        onReset={handleReset} isDirty={isDirty}
      />

      <div className="px-5 pb-6 pt-5 space-y-8">
        {/* Tier 1 */}
        <section>
          <SectionHeader title="Tier 1 — Executive Summary" sub="National KPIs" />
          <div className="mt-3">
            <Tier1KPIs kpis={kpis} />
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* Tier 2 */}
        <section className="space-y-6">
          <SectionHeader title="Tier 2 — Geographic & Trend Analysis" sub="Parish breakdown, trends, channel mix" />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Revenue by Parish</p>
              <ParishBarChart rows={parishRows} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Revenue Heatmap</p>
              <ParishHeatmapTable rows={parishRows} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Revenue Trend Over Time</p>
              <RevenueTrendChart
                filtered={filteredTransactions}
                trendParishes={trendParishes}
                setTrendParishes={setTrendParishes}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Revenue by Channel</p>
              <ChannelDonutChart rows={parishRows} />
            </div>
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* Tier 3 */}
        <section className="space-y-6">
          <SectionHeader title="Tier 3 — Granular Data & Diagnostics" sub="Parish matrix · Transaction audit" />
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Parish Performance Matrix</p>
            <ParishMatrix rows={parishRows} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Transaction Detail</p>
            <TransactionDetail filtered={filteredTransactions} />
          </div>
        </section>
      </div>
    </div>
  );
}
