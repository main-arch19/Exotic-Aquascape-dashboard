import {
  EventLog,
  Job,
  JobStatus,
  KPIs,
  TimeRecord,
  Tool,
  ToolStatus,
  User,
  WorkerPunchStatus,
  WorkerStatus,
} from './types';

// ─── Seed helpers ────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_USERS: User[] = [
  { id: 'w1', name: 'Marcus Rivera',   role: 'worker' },
  { id: 'w2', name: 'Priya Nair',      role: 'worker' },
  { id: 'w3', name: 'Devon Chang',     role: 'worker' },
  { id: 'w4', name: 'Aisha Thompson',  role: 'manager' },
  { id: 'w5', name: "Liam O'Brien",    role: 'worker' },
  { id: 'w6', name: 'Sofia Morales',   role: 'manager' },
  { id: 'w7', name: 'Trent Wallace',   role: 'worker' },
  { id: 'w8', name: 'Keisha Fontaine', role: 'worker' },
];

const SEED_JOBS: Job[] = [
  {
    id: 'j1',
    homeownerName: 'Evelyn Hart',
    address: '412 Coral Reef Dr, Miami FL 33101',
    scheduledTime: hoursAgo(2),
    assignedWorkerIds: ['w1', 'w2'],
    status: 'in_progress',
    createdAt: hoursAgo(5),
  },
  {
    id: 'j2',
    homeownerName: 'Nathan Brooks',
    address: '89 Tide Pool Ln, Fort Lauderdale FL 33301',
    scheduledTime: hoursAgo(1),
    assignedWorkerIds: ['w3'],
    status: 'delayed',
    createdAt: hoursAgo(3),
  },
  {
    id: 'j3',
    homeownerName: 'Carla Vega',
    address: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    scheduledTime: hoursFromNow(1),
    assignedWorkerIds: ['w4', 'w5'],
    status: 'scheduled',
    createdAt: hoursAgo(6),
  },
  {
    id: 'j4',
    homeownerName: 'James Whitfield',
    address: '57 Mangrove Ave, Hollywood FL 33020',
    scheduledTime: hoursAgo(4),
    assignedWorkerIds: ['w6'],
    status: 'completed',
    createdAt: hoursAgo(7),
  },
  {
    id: 'j5',
    homeownerName: 'Rosa Kim',
    address: '1801 Ocean Dr, Miami Beach FL 33139',
    scheduledTime: hoursAgo(0.5),
    assignedWorkerIds: ['w7', 'w8'],
    status: 'in_progress',
    createdAt: hoursAgo(4),
  },
  {
    id: 'j6',
    homeownerName: 'Derek Osei',
    address: '340 Palmetto Park Rd, Coral Springs FL 33071',
    scheduledTime: hoursFromNow(2.5),
    assignedWorkerIds: ['w1'],
    status: 'scheduled',
    createdAt: hoursAgo(1),
  },
  {
    id: 'j7',
    homeownerName: 'Linda Chen',
    address: '95 Sailfish Ave, Key Largo FL 33037',
    scheduledTime: hoursAgo(6),
    assignedWorkerIds: ['w2', 'w3'],
    status: 'completed',
    createdAt: hoursAgo(8),
  },
];

const SEED_WORKER_STATUSES: WorkerStatus[] = [
  { workerId: 'w1', workerName: 'Marcus Rivera',   punchStatus: 'clocked_in',  jobState: 'arrived',  currentJobId: 'j1', location: '412 Coral Reef Dr' },
  { workerId: 'w2', workerName: 'Priya Nair',      punchStatus: 'clocked_in',  jobState: 'arrived',  currentJobId: 'j1', location: '412 Coral Reef Dr' },
  { workerId: 'w3', workerName: 'Devon Chang',     punchStatus: 'clocked_in',  jobState: 'delayed',  currentJobId: 'j2' },
  { workerId: 'w4', workerName: 'Aisha Thompson',  punchStatus: 'clocked_in',  jobState: 'pending',  currentJobId: 'j3' },
  { workerId: 'w5', workerName: "Liam O'Brien",    punchStatus: 'clocked_in',  jobState: 'leaving',  currentJobId: 'j3', location: 'En route to Boca Raton' },
  { workerId: 'w6', workerName: 'Sofia Morales',   punchStatus: 'clocked_out', jobState: 'idle' },
  { workerId: 'w7', workerName: 'Trent Wallace',   punchStatus: 'clocked_in',  jobState: 'arrived',  currentJobId: 'j5', location: '1801 Ocean Dr' },
  { workerId: 'w8', workerName: 'Keisha Fontaine', punchStatus: 'clocked_in',  jobState: 'arrived',  currentJobId: 'j5', location: '1801 Ocean Dr' },
];

const SEED_TOOLS: Tool[] = [
  { id: 't1',  name: 'Siphon Vacuum Pro',     category: 'Cleaning',   status: 'checked_out', checkedOutById: 'w1', checkedOutByName: 'Marcus Rivera',   checkedOutAt: hoursAgo(2) },
  { id: 't2',  name: 'API Test Kit',          category: 'Testing',    status: 'checked_out', checkedOutById: 'w2', checkedOutByName: 'Priya Nair',      checkedOutAt: hoursAgo(2) },
  { id: 't3',  name: 'Algae Scraper Set',     category: 'Cleaning',   status: 'available' },
  { id: 't4',  name: 'Canister Filter',       category: 'Equipment',  status: 'checked_out', checkedOutById: 'w3', checkedOutByName: 'Devon Chang',     checkedOutAt: hoursAgo(1) },
  { id: 't5',  name: 'UV Sterilizer',         category: 'Equipment',  status: 'available' },
  { id: 't6',  name: 'Aquarium Net Bag',      category: 'Handling',   status: 'checked_out', checkedOutById: 'w7', checkedOutByName: 'Trent Wallace',   checkedOutAt: minutesAgo(40) },
  { id: 't7',  name: 'Protein Skimmer',       category: 'Equipment',  status: 'checked_out', checkedOutById: 'w8', checkedOutByName: 'Keisha Fontaine', checkedOutAt: minutesAgo(40) },
  { id: 't8',  name: 'Refractometer',         category: 'Testing',    status: 'available' },
  { id: 't9',  name: 'Magnetic Glass Cleaner',category: 'Cleaning',   status: 'checked_out', checkedOutById: 'w1', checkedOutByName: 'Marcus Rivera',   checkedOutAt: hoursAgo(1.5) },
  { id: 't10', name: 'Saltwater Mix Bucket',  category: 'Supplies',   status: 'available' },
  { id: 't11', name: 'RO/DI Water Container', category: 'Supplies',   status: 'checked_out', checkedOutById: 'w4', checkedOutByName: 'Aisha Thompson',  checkedOutAt: minutesAgo(90) },
  { id: 't12', name: 'Coral Frag Toolkit',    category: 'Handling',   status: 'available' },
];

const SEED_TIMESHEETS: TimeRecord[] = [
  { id: 'tr1', workerId: 'w1', workerName: 'Marcus Rivera',   punchIn: hoursAgo(4.5) },
  { id: 'tr2', workerId: 'w2', workerName: 'Priya Nair',      punchIn: hoursAgo(4) },
  { id: 'tr3', workerId: 'w3', workerName: 'Devon Chang',     punchIn: hoursAgo(3.5) },
  { id: 'tr4', workerId: 'w4', workerName: 'Aisha Thompson',  punchIn: hoursAgo(2.5) },
  { id: 'tr5', workerId: 'w5', workerName: "Liam O'Brien",    punchIn: hoursAgo(2.5) },
  { id: 'tr6', workerId: 'w6', workerName: 'Sofia Morales',   punchIn: hoursAgo(5), punchOut: hoursAgo(1), totalHours: 4.0 },
  { id: 'tr7', workerId: 'w7', workerName: 'Trent Wallace',   punchIn: hoursAgo(1) },
  { id: 'tr8', workerId: 'w8', workerName: 'Keisha Fontaine', punchIn: hoursAgo(1) },
  // Yesterday's completed records
  { id: 'tr9',  workerId: 'w1', workerName: 'Marcus Rivera',   punchIn: hoursAgo(28), punchOut: hoursAgo(20.5), totalHours: 7.5 },
  { id: 'tr10', workerId: 'w2', workerName: 'Priya Nair',      punchIn: hoursAgo(28), punchOut: hoursAgo(21),   totalHours: 7.0 },
  { id: 'tr11', workerId: 'w6', workerName: 'Sofia Morales',   punchIn: hoursAgo(27), punchOut: hoursAgo(19.5), totalHours: 7.5 },
  { id: 'tr12', workerId: 'w3', workerName: 'Devon Chang',     punchIn: hoursAgo(26), punchOut: hoursAgo(18),   totalHours: 8.0 },
];

const SEED_EVENTS: EventLog[] = [
  { id: uid(), timestamp: hoursAgo(4.5),     type: 'punch_in',      workerId: 'w1', workerName: 'Marcus Rivera',   message: 'Marcus Rivera punched in',                              severity: 'info' },
  { id: uid(), timestamp: hoursAgo(4),       type: 'punch_in',      workerId: 'w2', workerName: 'Priya Nair',      message: 'Priya Nair punched in',                                 severity: 'info' },
  { id: uid(), timestamp: hoursAgo(3.5),     type: 'punch_in',      workerId: 'w3', workerName: 'Devon Chang',     message: 'Devon Chang punched in',                                severity: 'info' },
  { id: uid(), timestamp: hoursAgo(3),       type: 'job_created',   workerId: 'system', workerName: 'System',      message: 'New job created for Evelyn Hart at 412 Coral Reef Dr',  jobId: 'j1', severity: 'info' },
  { id: uid(), timestamp: hoursAgo(2.8),     type: 'tool_checkout', workerId: 'w1', workerName: 'Marcus Rivera',   message: 'Marcus Rivera checked out Siphon Vacuum Pro',            severity: 'info' },
  { id: uid(), timestamp: hoursAgo(2.5),     type: 'punch_in',      workerId: 'w4', workerName: 'Aisha Thompson',  message: 'Aisha Thompson punched in',                             severity: 'info' },
  { id: uid(), timestamp: hoursAgo(2.5),     type: 'punch_in',      workerId: 'w5', workerName: "Liam O'Brien",    message: "Liam O'Brien punched in",                               severity: 'info' },
  { id: uid(), timestamp: hoursAgo(2),       type: 'arrived',       workerId: 'w1', workerName: 'Marcus Rivera',   message: 'Marcus Rivera arrived at 412 Coral Reef Dr',            jobId: 'j1', severity: 'success' },
  { id: uid(), timestamp: hoursAgo(2),       type: 'arrived',       workerId: 'w2', workerName: 'Priya Nair',      message: 'Priya Nair arrived at 412 Coral Reef Dr',               jobId: 'j1', severity: 'success' },
  { id: uid(), timestamp: hoursAgo(1.8),     type: 'tool_checkout', workerId: 'w2', workerName: 'Priya Nair',      message: 'Priya Nair checked out API Test Kit',                   severity: 'info' },
  { id: uid(), timestamp: hoursAgo(1.5),     type: 'tool_checkout', workerId: 'w1', workerName: 'Marcus Rivera',   message: 'Marcus Rivera checked out Magnetic Glass Cleaner',      severity: 'info' },
  { id: uid(), timestamp: hoursAgo(1.2),     type: 'delayed',       workerId: 'w3', workerName: 'Devon Chang',     message: 'Devon Chang reported delay: Heavy traffic on I-95',     jobId: 'j2', severity: 'warning' },
  { id: uid(), timestamp: hoursAgo(1),       type: 'punch_in',      workerId: 'w7', workerName: 'Trent Wallace',   message: 'Trent Wallace punched in',                              severity: 'info' },
  { id: uid(), timestamp: hoursAgo(1),       type: 'punch_in',      workerId: 'w8', workerName: 'Keisha Fontaine', message: 'Keisha Fontaine punched in',                            severity: 'info' },
  { id: uid(), timestamp: minutesAgo(55),    type: 'tool_checkout', workerId: 'w4', workerName: 'Aisha Thompson',  message: 'Aisha Thompson checked out RO/DI Water Container',     severity: 'info' },
  { id: uid(), timestamp: minutesAgo(50),    type: 'punch_out',     workerId: 'w6', workerName: 'Sofia Morales',   message: 'Sofia Morales punched out — 4.0h logged',              severity: 'info' },
  { id: uid(), timestamp: minutesAgo(42),    type: 'arrived',       workerId: 'w7', workerName: 'Trent Wallace',   message: 'Trent Wallace arrived at 1801 Ocean Dr',               jobId: 'j5', severity: 'success' },
  { id: uid(), timestamp: minutesAgo(41),    type: 'arrived',       workerId: 'w8', workerName: 'Keisha Fontaine', message: 'Keisha Fontaine arrived at 1801 Ocean Dr',             jobId: 'j5', severity: 'success' },
  { id: uid(), timestamp: minutesAgo(40),    type: 'tool_checkout', workerId: 'w7', workerName: 'Trent Wallace',   message: 'Trent Wallace checked out Aquarium Net Bag',           severity: 'info' },
  { id: uid(), timestamp: minutesAgo(40),    type: 'tool_checkout', workerId: 'w8', workerName: 'Keisha Fontaine', message: 'Keisha Fontaine checked out Protein Skimmer',          severity: 'info' },
  { id: uid(), timestamp: minutesAgo(22),    type: 'delayed',       workerId: 'w3', workerName: 'Devon Chang',     message: 'Devon Chang reported delay: Flat tire on US-1',        jobId: 'j2', severity: 'warning' },
  { id: uid(), timestamp: minutesAgo(15),    type: 'leaving',       workerId: 'w5', workerName: "Liam O'Brien",    message: "Liam O'Brien is leaving site — job wrapping up",       jobId: 'j3', severity: 'info' },
  { id: uid(), timestamp: minutesAgo(8),     type: 'tool_return',   workerId: 'w6', workerName: 'Sofia Morales',   message: 'Sofia Morales returned Protein Skimmer',               severity: 'info' },
  { id: uid(), timestamp: minutesAgo(3),     type: 'delayed',       workerId: 'w3', workerName: 'Devon Chang',     message: 'Devon Chang reported delay: Waiting for tow truck',          jobId: 'j2', severity: 'warning' },
  { id: uid(), timestamp: minutesAgo(2),     type: 'delayed',       workerId: 'w5', workerName: "Liam O'Brien",    message: "Liam O'Brien reported delay: Waiting for gate code from homeowner", jobId: 'j3', severity: 'warning' },
  { id: uid(), timestamp: minutesAgo(1),     type: 'delayed',       workerId: 'w2', workerName: 'Priya Nair',      message: 'Priya Nair reported delay: Equipment malfunction on site',    jobId: 'j1', severity: 'warning' },
];

// ─── In-memory store (singleton) ─────────────────────────────────────────────

class MockDatabase {
  users: User[] = [...SEED_USERS];
  jobs: Job[] = [...SEED_JOBS];
  workerStatuses: WorkerStatus[] = [...SEED_WORKER_STATUSES];
  tools: Tool[] = [...SEED_TOOLS];
  timesheets: TimeRecord[] = [...SEED_TIMESHEETS];
  events: EventLog[] = [...SEED_EVENTS].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // ── Event helpers ──────────────────────────────────────────────────────────

  addEvent(partial: Omit<EventLog, 'id' | 'timestamp'>): EventLog {
    const event: EventLog = {
      id: uid(),
      timestamp: new Date().toISOString(),
      ...partial,
    };
    this.events.unshift(event);
    if (this.events.length > 100) this.events = this.events.slice(0, 100);
    return event;
  }

  // ── Worker helpers ─────────────────────────────────────────────────────────

  getWorkerStatus(workerId: string): WorkerStatus | undefined {
    return this.workerStatuses.find((w) => w.workerId === workerId);
  }

  setWorkerPunchStatus(workerId: string, status: WorkerPunchStatus): WorkerStatus | null {
    const ws = this.getWorkerStatus(workerId);
    if (!ws) return null;
    ws.punchStatus = status;
    return ws;
  }

  // ── Job helpers ────────────────────────────────────────────────────────────

  getJob(jobId: string): Job | undefined {
    return this.jobs.find((j) => j.id === jobId);
  }

  setJobStatus(jobId: string, status: JobStatus): Job | null {
    const job = this.getJob(jobId);
    if (!job) return null;
    job.status = status;
    return job;
  }

  // ── Tool helpers ───────────────────────────────────────────────────────────

  getTool(toolId: string): Tool | undefined {
    return this.tools.find((t) => t.id === toolId);
  }

  setToolStatus(toolId: string, status: ToolStatus, worker?: { id: string; name: string }): Tool | null {
    const tool = this.getTool(toolId);
    if (!tool) return null;
    tool.status = status;
    if (status === 'checked_out' && worker) {
      tool.checkedOutById   = worker.id;
      tool.checkedOutByName = worker.name;
      tool.checkedOutAt     = new Date().toISOString();
    } else {
      delete tool.checkedOutById;
      delete tool.checkedOutByName;
      delete tool.checkedOutAt;
    }
    return tool;
  }

  // ── Timesheet helpers ──────────────────────────────────────────────────────

  getOpenRecord(workerId: string): TimeRecord | undefined {
    return this.timesheets.find((r) => r.workerId === workerId && !r.punchOut);
  }

  // ── KPI computation ────────────────────────────────────────────────────────

  getKPIs(): KPIs {
    const today = new Date().toDateString();
    return {
      activeJobs:      this.jobs.filter((j) => j.status === 'in_progress' || j.status === 'delayed').length,
      toolsCheckedOut: this.tools.filter((t) => t.status === 'checked_out').length,
      delaysToday:     this.events.filter(
        (e) => e.type === 'delayed' && new Date(e.timestamp).toDateString() === today
      ).length,
    };
  }
}

// Export as module-level singleton (persists across hot-reloads in dev via globalThis)
const globalForDb = globalThis as typeof globalThis & { __mockDb?: MockDatabase };
if (!globalForDb.__mockDb) globalForDb.__mockDb = new MockDatabase();
export const db = globalForDb.__mockDb;
