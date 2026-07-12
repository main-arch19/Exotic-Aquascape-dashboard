'use client';

import { useDashboard } from '@/context/DashboardContext';

// Mock scheduler data removed - real jobs shown from dashboard context
export function JobScheduler() {
  const { jobs: liveJobs } = useDashboard();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Scheduler</h2>
      <p className="text-gray-500 mb-3">Mock scheduler data removed. Real-time jobs shown below:</p>
      <p className="text-sm text-gray-600">Total Live Jobs: {liveJobs.length}</p>
    </div>
  );
}
