'use client';

import { KPICards } from './KPICards';
import { ActiveJobsSection } from './ActiveJobsSection';
import { ToolsCheckedOutSection } from './ToolsCheckedOutSection';
import { DelaysReportedSection } from './DelaysReportedSection';
import { FieldWorkersSection } from './FieldWorkersSection';
import { LiveActivitySection } from './LiveActivitySection';

export function CEOView() {
  return (
    <div className="space-y-6">
      <KPICards />
      <ActiveJobsSection />
      <ToolsCheckedOutSection />
      <DelaysReportedSection />
      <FieldWorkersSection />
      <LiveActivitySection />
    </div>
  );
}
