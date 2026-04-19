'use client';

import { useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { KPICards } from './KPICards';
import { ActiveJobsSection } from './ActiveJobsSection';
import { ToolsCheckedOutSection } from './ToolsCheckedOutSection';
import { DelaysReportedSection } from './DelaysReportedSection';
import { FieldWorkersSection } from './FieldWorkersSection';
import { LiveActivitySection } from './LiveActivitySection';
import { RevenueDashboard } from './RevenueDashboard';

function RevenueBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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

export function CEOView() {
  return (
    <div className="space-y-6">
      <KPICards />
      <ActiveJobsSection />
      <ToolsCheckedOutSection />
      <DelaysReportedSection />
      <FieldWorkersSection />
      <LiveActivitySection />
      <RevenueBar />
    </div>
  );
}
