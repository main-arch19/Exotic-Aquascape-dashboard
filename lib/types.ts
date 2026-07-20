export type WorkerPunchStatus = 'clocked_in' | 'clocked_out';
export type JobState = 'idle' | 'pending' | 'arrived' | 'leaving' | 'delayed';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'delayed';
export type ToolStatus = 'available' | 'checked_out';
export type EventType =
  | 'punch_in'
  | 'punch_out'
  | 'arrived'
  | 'leaving'
  | 'delayed'
  | 'tool_checkout'
  | 'tool_return'
  | 'job_created'
  // Must stay in sync with the event_logs_type_check constraint, last rebuilt in
  // migration 007 — an unlisted value fails the insert at runtime.
  | 'trip_started'
  | 'trip_ended'
  | 'job_assigned'
  | 'job_unassigned'
  | 'job_accepted';

export interface User {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'worker';
  avatarUrl?: string;
  approved: boolean;
  // Removed by the CEO. Distinguishes a departed member from a new sign-up
  // awaiting approval — both have approved === false.
  revoked: boolean;
}

export interface WorkerStatus {
  workerId: string;
  workerName: string;
  punchStatus: WorkerPunchStatus;
  jobState: JobState;
  currentJobId?: string;
  location?: string;
}

// One agent's assignment to one job. `acceptedAt` is the AUTHORITATIVE record of
// acceptance — worker_statuses.job_state is only a display convenience, since it
// is single-valued per worker while assignment is many-to-many per job.
export interface JobAssignment {
  workerId: string;
  assignedAt: string | null;
  acceptedAt: string | null;
  assignedBy: string | null;
}

export interface Job {
  id: string;
  homeownerName: string;
  address: string;
  scheduledTime: string;
  // Kept alongside `assignments` because ActiveJobsSection and other read-only
  // surfaces still index on it.
  assignedWorkerIds: string[];
  assignments: JobAssignment[];
  // The owning manager, distinct from the field agents in `assignments`.
  managerId?: string;
  status: JobStatus;
  createdAt: string;
  homeownerEmail?: string;
}

export interface Tool {
  id: string;
  name: string;
  category: string;
  status: ToolStatus;
  checkedOutById?: string;
  checkedOutByName?: string;
  checkedOutAt?: string;
}

export interface TimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  punchIn: string;
  punchOut?: string;
  totalHours?: number;
}

export interface EventLog {
  id: string;
  timestamp: string;
  type: EventType;
  workerId: string;
  workerName: string;
  message: string;
  jobId?: string;
  severity: 'info' | 'warning' | 'success';
}

export interface KPIs {
  activeJobs: number;
  toolsCheckedOut: number;
  delaysToday: number;
}

export interface DashboardState {
  users: User[];
  workerStatuses: WorkerStatus[];
  jobs: Job[];
  tools: Tool[];
  timesheets: TimeRecord[];
  kpis: KPIs;
}

// Authenticated user surfaced to the client via /api/me.
export interface CurrentUser {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'worker';
  avatarUrl?: string;
  approved: boolean;
}
