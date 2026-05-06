'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Wrench, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/context/DashboardContext';
import type { Tool } from '@/lib/types';

const HEALTH: Record<string, { pct: number; serial: string; lastService: string }> = {
  t1:  { pct: 72, serial: 'SVP-2023-001', lastService: '2026-03-15' },
  t2:  { pct: 91, serial: 'ATK-2024-002', lastService: '2026-04-02' },
  t3:  { pct: 85, serial: 'ASS-2022-003', lastService: '2026-02-28' },
  t4:  { pct: 43, serial: 'CNF-2021-004', lastService: '2025-12-10' },
  t5:  { pct: 88, serial: 'UVS-2023-005', lastService: '2026-04-01' },
  t6:  { pct: 60, serial: 'ANB-2022-006', lastService: '2026-01-20' },
  t7:  { pct: 35, serial: 'PSK-2020-007', lastService: '2025-10-05' },
  t8:  { pct: 95, serial: 'RFR-2024-008', lastService: '2026-04-10' },
  t9:  { pct: 55, serial: 'MGC-2023-009', lastService: '2026-02-14' },
  t10: { pct: 78, serial: 'SMB-2022-010', lastService: '2026-03-01' },
  t11: { pct: 66, serial: 'ROD-2023-011', lastService: '2026-03-22' },
  t12: { pct: 90, serial: 'CFT-2024-012', lastService: '2026-04-05' },
};

function glowConfig(pct: number) {
  if (pct >= 80) return {
    barColor: '#22c55e',
    barGlow: '0 0 10px #22c55e, 0 0 24px rgba(34,197,94,0.45)',
    barPulse: false,
    ledClass: 'bg-emerald-400',
    ledStyle: { boxShadow: '0 0 5px #22c55e, 0 0 12px rgba(34,197,94,0.6)' } as React.CSSProperties,
    label: 'Healthy',
    labelClass: 'text-emerald-500',
  };
  if (pct >= 50) return {
    barColor: '#f97316',
    barGlow: '0 0 10px #f97316, 0 0 24px rgba(249,115,22,0.45)',
    barPulse: false,
    ledClass: 'bg-orange-400',
    ledStyle: { boxShadow: '0 0 5px #f97316, 0 0 12px rgba(249,115,22,0.6)' } as React.CSSProperties,
    label: 'Fair',
    labelClass: 'text-orange-400',
  };
  return {
    barColor: '#ef4444',
    barGlow: undefined,
    barPulse: true,
    ledClass: 'bg-red-500 neon-pulse-red',
    ledStyle: {} as React.CSSProperties,
    label: 'Needs Attention',
    labelClass: 'text-red-500',
  };
}

function ToolRow({ tool }: { tool: Tool }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(`tool-notes-${tool.id}`) ?? '';
  });
  const [saved, setSaved] = useState(false);

  const health = HEALTH[tool.id] ?? { pct: 80, serial: 'N/A', lastService: 'N/A' };
  const glow = glowConfig(health.pct);

  const handleSave = () => {
    localStorage.setItem(`tool-notes-${tool.id}`, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80"
      >
        <Wrench className="h-3.5 w-3.5 shrink-0 text-sky-400" />
        <span className="flex-1 text-sm font-semibold text-gray-800">{tool.name}</span>
        <span className="text-xs text-gray-400">{tool.category}</span>
        <span
          className={`mx-3 h-2.5 w-2.5 shrink-0 rounded-full ${glow.ledClass}`}
          style={glow.ledStyle}
        />
        <span className="text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Animated expanded panel using CSS Grid rows trick */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 bg-gradient-to-b from-slate-50 to-white px-4 pb-5 pt-4">

            {/* Health bar */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Tool Health
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-gray-800">{health.pct}%</span>
                  <span className={`text-xs font-medium ${glow.labelClass}`}>{glow.label}</span>
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500${glow.barPulse ? ' neon-pulse-red' : ''}`}
                  style={{
                    width: `${health.pct}%`,
                    backgroundColor: glow.barColor,
                    boxShadow: glow.barPulse ? undefined : glow.barGlow,
                  }}
                />
              </div>
            </div>

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Serial #</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-gray-700">{health.serial}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Last Service</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-gray-700">
                  {format(new Date(health.lastService), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Notes logbook */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Maintenance &amp; Condition Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Log condition updates, repairs, or issues here…"
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-950/[0.03] px-3 py-2.5 font-mono text-xs text-gray-700 placeholder:text-gray-300 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                {saved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 active:scale-95"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToolInventoryHealthSection() {
  const { tools, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200" />
            <Skeleton className="h-4 w-40 bg-gray-200" />
            <Skeleton className="ml-auto h-3 w-16 bg-gray-200" />
            <Skeleton className="h-2.5 w-2.5 rounded-full bg-gray-200 mx-3" />
            <Skeleton className="h-4 w-4 bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {tools.map((tool) => (
        <ToolRow key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
