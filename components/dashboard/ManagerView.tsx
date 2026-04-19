'use client';

import { WorkerClockPanel } from './WorkerClockPanel';
import { ActiveJobsManager } from './ActiveJobsManager';
import { ToolInventoryTable } from './ToolInventoryTable';
import { TimesheetView } from './TimesheetView';

export function ManagerView() {
  return (
    <div className="space-y-6">
      <WorkerClockPanel />
      <ActiveJobsManager />
      <ToolInventoryTable />
      <TimesheetView />
    </div>
  );
}
