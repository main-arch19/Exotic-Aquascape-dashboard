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
  | 'job_created';

export interface User {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'worker';
  avatarUrl?: string;
}

export interface WorkerStatus {
  workerId: string;
  workerName: string;
  punchStatus: WorkerPunchStatus;
  jobState: JobState;
  currentJobId?: string;
  location?: string;
}

export interface Job {
  id: string;
  homeownerName: string;
  address: string;
  scheduledTime: string;
  assignedWorkerIds: string[];
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
}

// The shapes below intentionally match what the vue-advanced-chat web component
// expects for its `rooms` and `messages` props, so API responses can be passed
// through with minimal massaging.
export interface ChatRoomUser {
  _id: string;
  username: string;
  avatar?: string;
}

export interface ChatRoom {
  roomId: string;
  roomName: string;
  users: ChatRoomUser[];
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    username: string;
    timestamp: string;
  };
}

// API shape for a chat message. Carries an ISO `createdAt`; the client formats
// the vue-advanced-chat `date`/`timestamp` display labels in the viewer's own
// timezone before handing them to the web component.
export interface ChatMessageDTO {
  _id: string;
  roomId: string;
  content: string;
  senderId: string;
  username: string;
  createdAt: string; // ISO 8601
  deleted?: boolean;
}
