'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Wrench, ChevronDown, ChevronUp, CheckCircle2,
  Pencil, Trash2, PlusCircle, Loader2, Check, X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/context/DashboardContext';
import type { Tool } from '@/lib/types';

// ─── Health data (localStorage-backed, with static defaults) ─────────────────

type HealthData = { pct: number; serial: string; lastService: string };

const HEALTH_DEFAULTS: Record<string, HealthData> = {
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

const TODAY_ISO = new Date().toISOString().slice(0, 10);

function loadHealth(toolId: string): HealthData {
  if (typeof window === 'undefined') return HEALTH_DEFAULTS[toolId] ?? { pct: 100, serial: 'N/A', lastService: TODAY_ISO };
  const stored = localStorage.getItem(`tool-health-${toolId}`);
  if (stored) { try { return JSON.parse(stored); } catch { /* fall through */ } }
  return HEALTH_DEFAULTS[toolId] ?? { pct: 100, serial: 'N/A', lastService: TODAY_ISO };
}

// ─── Glow helpers ─────────────────────────────────────────────────────────────

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

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls = 'rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-300 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-400';

// ─── Add Tool Form ────────────────────────────────────────────────────────────

function AddToolForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setSaving(true);
    await fetch('/api/tools/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category: category.trim() }),
    });
    setSaving(false);
    onAdded();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 border-t border-emerald-100 bg-emerald-50/50 px-4 py-3"
    >
      <PlusCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tool name"
        className={`${inputCls} min-w-[140px] flex-1`}
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        list="category-options"
        className={`${inputCls} min-w-[120px] w-36`}
      />
      <datalist id="category-options">
        {['Cleaning', 'Testing', 'Equipment', 'Handling', 'Supplies'].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button
        type="submit"
        disabled={saving || !name.trim() || !category.trim()}
        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Add Tool
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

// ─── Tool Row ─────────────────────────────────────────────────────────────────

function ToolRow({ tool, onDeleted, onUpdated }: {
  tool: Tool;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Edit name / category
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tool.name);
  const [editCategory, setEditCategory] = useState(tool.category);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Health data — saved state vs. working state
  const [health, setHealth] = useState<HealthData>(() => loadHealth(tool.id));
  const [editHealth, setEditHealth] = useState<HealthData>(() => loadHealth(tool.id));
  const [healthSaved, setHealthSaved] = useState(false);

  // Notes
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(`tool-notes-${tool.id}`) ?? '';
  });
  const [notesSaved, setNotesSaved] = useState(false);

  const glow = glowConfig(health.pct);
  const previewGlow = glowConfig(editHealth.pct);

  const handleSaveEdit = async () => {
    setSaving(true);
    await fetch('/api/tools/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id, name: editName.trim(), category: editCategory.trim() }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch('/api/tools/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id }),
    });
    localStorage.removeItem(`tool-health-${tool.id}`);
    localStorage.removeItem(`tool-notes-${tool.id}`);
    onDeleted();
  };

  const handleSaveHealth = () => {
    const clamped = { ...editHealth, pct: Math.max(0, Math.min(100, editHealth.pct)) };
    localStorage.setItem(`tool-health-${tool.id}`, JSON.stringify(clamped));
    setHealth(clamped);
    setEditHealth(clamped);
    setHealthSaved(true);
    setTimeout(() => setHealthSaved(false), 2000);
  };

  const handleSaveNotes = () => {
    localStorage.setItem(`tool-notes-${tool.id}`, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  // ── Edit mode replaces the header row ────────────────────────────────────
  if (editing) {
    return (
      <div className="border-b border-gray-100 last:border-0 bg-sky-50/50">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={`${inputCls} min-w-[140px] flex-1 font-semibold`}
          />
          <input
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            list="category-options-edit"
            className={`${inputCls} min-w-[120px] w-36`}
          />
          <datalist id="category-options-edit">
            {['Cleaning', 'Testing', 'Equipment', 'Handling', 'Supplies'].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={saving || !editName.trim() || !editCategory.trim()}
            className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setEditName(tool.name); setEditCategory(tool.category); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Normal mode ───────────────────────────────────────────────────────────
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1 px-4 py-2.5">
        {/* Clickable expand area */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <Wrench className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          <span className="flex-1 text-sm font-semibold text-gray-800">{tool.name}</span>
          <span className="text-xs text-gray-400">{tool.category}</span>
          <span
            className={`mx-2 h-2.5 w-2.5 shrink-0 rounded-full ${glow.ledClass}`}
            style={glow.ledStyle}
          />
        </button>

        {/* Action buttons */}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs font-medium text-red-500">Delete?</span>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Confirm
            </button>
          </div>
        ) : (
          <div className="ml-1 flex items-center gap-0.5">
            <button
              type="button"
              title="Edit tool"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-gray-300 transition-colors hover:bg-sky-50 hover:text-sky-500"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete tool"
              onClick={() => setConfirmDelete(true)}
              className="rounded-md p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-1 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Animated expanded panel */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 bg-gradient-to-b from-slate-50 to-white px-4 pb-5 pt-3">

            {/* Health bar — live-previews editHealth.pct while typing */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Tool Health
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-gray-800">{editHealth.pct}%</span>
                  <span className={`text-xs font-medium ${previewGlow.labelClass}`}>{previewGlow.label}</span>
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500${previewGlow.barPulse ? ' neon-pulse-red' : ''}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, editHealth.pct))}%`,
                    backgroundColor: previewGlow.barColor,
                    boxShadow: previewGlow.barPulse ? undefined : previewGlow.barGlow,
                  }}
                />
              </div>
            </div>

            {/* Editable specs */}
            <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Tool Specs
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-400">Health %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editHealth.pct}
                    onChange={(e) => setEditHealth((h) => ({ ...h, pct: Number(e.target.value) }))}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-400">Serial #</label>
                  <input
                    value={editHealth.serial}
                    onChange={(e) => setEditHealth((h) => ({ ...h, serial: e.target.value }))}
                    className={`${inputCls} w-full font-mono`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-400">Last Service</label>
                  <input
                    type="date"
                    value={editHealth.lastService}
                    onChange={(e) => setEditHealth((h) => ({ ...h, lastService: e.target.value }))}
                    className={`${inputCls} w-full`}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-400">
                  {editHealth.lastService
                    ? `Last serviced ${format(new Date(editHealth.lastService), 'MMM d, yyyy')}`
                    : ''}
                </span>
                <div className="flex items-center gap-2">
                  {healthSaved && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHealth}
                    className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 active:scale-95"
                  >
                    Update Specs
                  </button>
                </div>
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
                {notesSaved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveNotes}
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

// ─── Section export ───────────────────────────────────────────────────────────

export function ToolInventoryHealthSection() {
  const { tools, isLoading, refresh } = useDashboard();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdded = async () => {
    await refresh();
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200" />
            <Skeleton className="h-4 w-40 bg-gray-200" />
            <Skeleton className="ml-auto h-3 w-16 bg-gray-200" />
            <Skeleton className="mx-3 h-2.5 w-2.5 rounded-full bg-gray-200" />
            <Skeleton className="h-4 w-4 bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-100">
        {tools.map((tool) => (
          <ToolRow
            key={tool.id}
            tool={tool}
            onDeleted={refresh}
            onUpdated={refresh}
          />
        ))}
        {tools.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No tools in inventory.</p>
        )}
      </div>

      {showAddForm ? (
        <AddToolForm onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50/50"
        >
          <PlusCircle className="h-4 w-4" />
          Add Tool
        </button>
      )}
    </div>
  );
}
