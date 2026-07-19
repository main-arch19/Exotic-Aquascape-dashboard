'use client';

import { WorkerClockPanel } from './WorkerClockPanel';
import { ActiveJobsManager } from './ActiveJobsManager';
import { ToolInventoryTable } from './ToolInventoryTable';
import { TimesheetView } from './TimesheetView';
import { TripControlPanel } from '@/components/tracking/TripControlPanel';

export function AgentView() {
  return (
    <div className="space-y-6">
      {/* First, deliberately: while a trip is running this renders the
          "Location sharing is ON" banner, which must not sit below the fold. */}
      <TripControlPanel />
      <WorkerClockPanel />
      <ActiveJobsManager hideAdd />
      <ToolInventoryTable hideAdd />
      <TimesheetView />
    </div>
  );
}
