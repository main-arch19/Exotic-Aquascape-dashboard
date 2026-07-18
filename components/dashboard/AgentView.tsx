'use client';

import { WorkerClockPanel } from './WorkerClockPanel';
import { ActiveJobsManager } from './ActiveJobsManager';
import { ToolInventoryTable } from './ToolInventoryTable';
import { TimesheetView } from './TimesheetView';

export function AgentView() {
  return (
    <div className="space-y-6">
      <WorkerClockPanel />
      <ActiveJobsManager hideAdd />
      <ToolInventoryTable hideAdd />
      <TimesheetView />
    </div>
  );
}
