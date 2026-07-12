-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ceo', 'manager', 'worker')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  homeowner_name TEXT NOT NULL,
  address TEXT NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'delayed')),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create jobs_workers junction table (many-to-many)
CREATE TABLE jobs_workers (
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, worker_id)
);

-- Create worker_statuses table
CREATE TABLE worker_statuses (
  worker_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  punch_status TEXT NOT NULL CHECK (punch_status IN ('clocked_in', 'clocked_out')),
  job_state TEXT NOT NULL CHECK (job_state IN ('idle', 'pending', 'arrived', 'leaving', 'delayed')),
  current_job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  location TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tools table
CREATE TABLE tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'checked_out')),
  checked_out_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  checked_out_by_name TEXT,
  checked_out_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create timesheets table
CREATE TABLE timesheets (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  punch_in TIMESTAMP NOT NULL,
  punch_out TIMESTAMP,
  total_hours NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create event_logs table
CREATE TABLE event_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('punch_in', 'punch_out', 'arrived', 'leaving', 'delayed', 'tool_checkout', 'tool_return', 'job_created')),
  worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  message TEXT NOT NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'success')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_worker_statuses_punch ON worker_statuses(punch_status);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_timesheets_worker ON timesheets(worker_id);
CREATE INDEX idx_event_logs_timestamp ON event_logs(timestamp);
CREATE INDEX idx_event_logs_worker ON event_logs(worker_id);
