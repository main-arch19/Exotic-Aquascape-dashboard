'use client';

import { KPICards } from './KPICards';
// Replaced the read-only ActiveJobsSection, which was a near-duplicate of this
// component's job list. The CEO needs assignment controls on their own tab, and
// this removes a second list that had to be kept in sync.
import { ActiveJobsManager } from './ActiveJobsManager';
import { ToolsCheckedOutSection } from './ToolsCheckedOutSection';
import { DelaysReportedSection } from './DelaysReportedSection';
import { FieldWorkersSection } from './FieldWorkersSection';
import { LiveActivitySection } from './LiveActivitySection';

export function CEOView() {
  return (
    <div className="space-y-6">
      <KPICards />
      <ActiveJobsManager />
      <ToolsCheckedOutSection />
      <DelaysReportedSection />
      <FieldWorkersSection />
      <LiveActivitySection />
    </div>
  );
}
