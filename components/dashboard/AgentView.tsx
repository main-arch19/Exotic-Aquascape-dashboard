'use client';

import { WorkerClockPanel } from './WorkerClockPanel';
import { AgentJobList } from './AgentJobList';
import { ToolInventoryTable } from './ToolInventoryTable';
import { TimesheetView } from './TimesheetView';
import { TrackingSessionProvider } from '@/components/tracking/TrackingSessionProvider';
import { TrackingStatusPanel } from '@/components/tracking/TrackingStatusPanel';

export function AgentView() {
  return (
    <div className="space-y-6">
      {/* The provider wraps both the status banner and the job list because a
          single location-tracker instance has to serve Accept (in the list) and
          the live status (in the banner). */}
      <TrackingSessionProvider>
        {/* First, deliberately: while sharing is active this renders the
            "Location sharing is ON" banner, which must not sit below the fold. */}
        <TrackingStatusPanel />
        <WorkerClockPanel selfOnly />
        <AgentJobList />
      </TrackingSessionProvider>
      <ToolInventoryTable hideAdd />
      <TimesheetView />
    </div>
  );
}
