export type SchedulerStatus = 'running' | 'completed' | 'failed' | 'queued' | 'sla_at_risk';
export type ScheduleType = 'recurring' | 'one_time' | 'event_triggered';
export type ServiceType =
  | 'Installation'
  | 'Maintenance'
  | 'Water Testing'
  | 'Equipment Delivery'
  | 'Emergency Repair'
  | 'Deep Clean';

export interface RunRecord {
  id: string;
  startTime: Date;
  duration: number;
  status: 'running' | 'completed' | 'failed';
  log: string;
}

export interface SchedulerJob {
  id: string;
  name: string;
  status: SchedulerStatus;
  schedule: string;
  scheduleType: ScheduleType;
  serviceType: ServiceType;
  crew: string[];
  location: string;
  tags: string[];
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  avgDuration: number;
  successRate: number;
  createdAt: Date;
  dependsOn: string[];
  runHistory: RunRecord[];
}

export interface SchedulerWorkflow {
  id: string;
  name: string;
  jobIds: string[];
}

const now = new Date('2026-05-05T10:30:00');
const h = (hours: number) => new Date(now.getTime() + hours * 3600_000);
const hAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000);

function runs(
  baseTime: Date,
  count: number,
  avgDur: number,
  successRate: number,
  logTemplates: string[],
): RunRecord[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(baseTime.getTime() - i * 24 * 3600_000 - Math.random() * 3600_000);
    const failed = Math.random() > successRate / 100;
    const dur = Math.round(avgDur * (0.85 + Math.random() * 0.3));
    return {
      id: `run-${baseTime.getTime()}-${i}`,
      startTime: start,
      duration: dur,
      status: (failed ? 'failed' : i === 0 && successRate > 95 ? 'completed' : 'completed') as RunRecord['status'],
      log: logTemplates[i % logTemplates.length],
    };
  });
}

const CORAL_LOGS = [
  '[08:00:01] Job started — Tank_Install_Coral_Reef_Dr\n[08:00:05] Crew en route: Marcus Rivera, Priya Nair\n[08:47:12] Arrived on site\n[09:15:44] Substrate laid — 80 lbs aragonite\n[10:02:33] Filtration system installed and primed\n[10:58:01] Livestock transfer complete\n[11:00:00] Job completed successfully',
  '[08:00:01] Job started\n[08:01:00] Crew dispatch confirmed\n[09:05:18] On site — begin tank teardown\n[09:45:00] ERROR: Pump seal leaking — replacement ordered\n[10:30:00] Replacement arrived\n[11:15:00] Pump installed and tested\n[12:00:00] Job completed with delay',
];

const MAINT_LOGS = [
  '[09:00:00] Maintenance job started\n[09:12:00] Chemical levels checked — pH 8.2, ammonia 0ppm\n[09:30:00] Filter media replaced\n[09:45:00] 20% water change complete\n[10:00:00] Job completed',
  '[09:00:00] Maintenance started\n[09:05:00] WARNING: Nitrate spike detected — 40ppm\n[09:30:00] Emergency water change — 40% volume\n[10:15:00] Re-test: nitrate 15ppm — acceptable\n[10:20:00] Job completed with warning',
];

const WATER_TEST_LOGS = [
  '[10:00:00] Water test initiated\n[10:05:00] Salinity: 1.025 SG ✓\n[10:06:00] pH: 8.3 ✓\n[10:07:00] Ammonia: 0 ppm ✓\n[10:08:00] Nitrite: 0 ppm ✓\n[10:09:00] Calcium: 420 ppm ✓\n[10:15:00] Report uploaded to client portal',
  '[10:00:00] Water test started\n[10:05:00] ALERT: pH 7.9 — below threshold\n[10:10:00] Added buffer solution\n[10:40:00] Re-test: pH 8.1 — borderline\n[10:45:00] Crew notified. Follow-up scheduled.\n[10:50:00] Job completed with issues',
];

const DELIVERY_LOGS = [
  '[07:30:00] Equipment delivery job dispatched\n[07:31:00] Loading: 200-gal reef tank, sump, return pump\n[08:45:00] Arrived — 412 Coral Reef Dr\n[09:00:00] Delivery confirmed by homeowner\n[09:05:00] Job complete',
  '[07:30:00] Delivery started\n[08:00:00] ERROR: Wrong pump model loaded — returning to warehouse\n[09:30:00] Correct model dispatched\n[11:00:00] Delivery complete — 3h delay logged',
];

const EMERGENCY_LOGS = [
  '[14:22:00] Emergency repair triggered — leak reported\n[14:23:00] Nearest crew dispatched: Devon Chang\n[15:01:00] On site — active leak at sump return\n[15:15:00] Leak sealed with epoxy\n[15:30:00] Water damage assessed — minimal\n[15:45:00] Job complete',
  '[02:15:00] After-hours emergency: tank crack reported\n[02:17:00] On-call crew dispatched: Trent Wallace\n[03:00:00] On site — hairline fracture in rear panel\n[03:45:00] Livestock emergency-transferred to holding tank\n[05:00:00] Replacement tank installed\n[05:30:00] Job complete',
];

const DEEP_CLEAN_LOGS = [
  '[08:00:00] Monthly deep clean started\n[08:30:00] Glass scraped — algae cleared\n[09:00:00] Skimmer cleaned and reassembled\n[09:45:00] Powerhead cleaned\n[10:30:00] 30% water change\n[11:00:00] Job complete',
  '[08:00:00] Deep clean started\n[09:00:00] Found: Aiptasia outbreak — treatment applied\n[09:30:00] Additional treatment: Peppermint shrimp added\n[11:00:00] Clean complete — follow-up in 2 weeks recommended',
];

const ALGAE_LOGS = [
  '[11:00:00] Algae treatment job started\n[11:10:00] Identified: Hair algae, bubble algae patches\n[11:30:00] Manual removal — 80% clearance\n[11:45:00] Phosphate remover added to sump\n[12:00:00] Job complete',
  '[11:00:00] Algae treatment started\n[11:15:00] Severe bloom detected — Cyano outbreak\n[11:30:00] Increased flow, added Chemi-Clean\n[12:30:00] Follow-up required in 48h\n[12:35:00] Job complete with advisory',
];

export const SCHEDULER_JOBS: SchedulerJob[] = [
  // ── DEPENDENCY CHAIN 1: Palmetto Park Full Install ──
  {
    id: 'equip_delivery_palmetto',
    name: 'Equipment_Delivery_Palmetto',
    status: 'completed',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Equipment Delivery',
    crew: ['Marcus Rivera', 'Trent Wallace'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['delivery', 'install-chain', 'priority'],
    lastRun: hAgo(8),
    nextRun: null,
    duration: 95,
    avgDuration: 90,
    successRate: 90,
    createdAt: hAgo(72),
    dependsOn: [],
    runHistory: runs(hAgo(8), 6, 90, 90, DELIVERY_LOGS),
  },
  {
    id: 'tank_install_coral_springs',
    name: 'Full_Setup_Coral_Springs',
    status: 'running',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Installation',
    crew: ['Marcus Rivera', 'Priya Nair'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['install', 'install-chain', 'reef', 'priority'],
    lastRun: hAgo(0.5),
    nextRun: null,
    duration: 45,
    avgDuration: 210,
    successRate: 88,
    createdAt: hAgo(72),
    dependsOn: ['equip_delivery_palmetto'],
    runHistory: runs(hAgo(0.5), 4, 210, 88, CORAL_LOGS),
  },
  {
    id: 'water_test_coral_springs',
    name: 'Water_Test_Coral_Springs',
    status: 'queued',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Water Testing',
    crew: ['Priya Nair'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['water-test', 'install-chain'],
    lastRun: null,
    nextRun: h(3),
    duration: 0,
    avgDuration: 25,
    successRate: 95,
    createdAt: hAgo(72),
    dependsOn: ['tank_install_coral_springs'],
    runHistory: [],
  },
  {
    id: 'client_walkthrough_coral_springs',
    name: 'Client_Walkthrough_Coral_Springs',
    status: 'queued',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Maintenance',
    crew: ['Aisha Thompson'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['client', 'install-chain', 'closeout'],
    lastRun: null,
    nextRun: h(5),
    duration: 0,
    avgDuration: 45,
    successRate: 100,
    createdAt: hAgo(72),
    dependsOn: ['water_test_coral_springs'],
    runHistory: [],
  },

  // ── DEPENDENCY CHAIN 2: Ocean Dr Emergency Repair ──
  {
    id: 'emergency_leak_ocean',
    name: 'Emergency_Leak_Repair_Ocean_Dr',
    status: 'completed',
    schedule: 'Event-triggered',
    scheduleType: 'event_triggered',
    serviceType: 'Emergency Repair',
    crew: ['Devon Chang'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['emergency', 'leak', 'after-hours'],
    lastRun: hAgo(18),
    nextRun: null,
    duration: 83,
    avgDuration: 75,
    successRate: 92,
    createdAt: hAgo(20),
    dependsOn: [],
    runHistory: runs(hAgo(18), 5, 75, 92, EMERGENCY_LOGS),
  },
  {
    id: 'water_test_ocean_followup',
    name: 'Water_Test_Ocean_Dr_Followup',
    status: 'running',
    schedule: 'Event-triggered',
    scheduleType: 'event_triggered',
    serviceType: 'Water Testing',
    crew: ['Priya Nair'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['water-test', 'emergency-followup'],
    lastRun: hAgo(0.25),
    nextRun: null,
    duration: 15,
    avgDuration: 25,
    successRate: 95,
    createdAt: hAgo(20),
    dependsOn: ['emergency_leak_ocean'],
    runHistory: runs(hAgo(0.25), 3, 25, 95, WATER_TEST_LOGS),
  },

  // ── DEPENDENCY CHAIN 3: Blue Lagoon Weekly Cycle ──
  {
    id: 'weekly_maint_blue_lagoon',
    name: 'Weekly_Maintenance_Blue_Lagoon',
    status: 'completed',
    schedule: '0 9 * * 1',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Keisha Fontaine'],
    location: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    tags: ['weekly', 'maintenance', 'recurring'],
    lastRun: hAgo(48),
    nextRun: h(120),
    duration: 62,
    avgDuration: 60,
    successRate: 94,
    createdAt: hAgo(365),
    dependsOn: [],
    runHistory: runs(hAgo(48), 8, 60, 94, MAINT_LOGS),
  },
  {
    id: 'water_test_blue_lagoon',
    name: 'Water_Test_Blue_Lagoon',
    status: 'completed',
    schedule: '0 11 * * 1',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Keisha Fontaine'],
    location: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    tags: ['weekly', 'water-test', 'recurring'],
    lastRun: hAgo(46),
    nextRun: h(122),
    duration: 22,
    avgDuration: 25,
    successRate: 97,
    createdAt: hAgo(365),
    dependsOn: ['weekly_maint_blue_lagoon'],
    runHistory: runs(hAgo(46), 8, 25, 97, WATER_TEST_LOGS),
  },
  {
    id: 'report_blue_lagoon',
    name: 'Monthly_Report_Blue_Lagoon',
    status: 'sla_at_risk',
    schedule: '0 12 1 * *',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Aisha Thompson'],
    location: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    tags: ['monthly', 'report', 'sla'],
    lastRun: hAgo(720),
    nextRun: h(2),
    duration: 38,
    avgDuration: 30,
    successRate: 78,
    createdAt: hAgo(365),
    dependsOn: ['water_test_blue_lagoon'],
    runHistory: runs(hAgo(720), 5, 30, 78, MAINT_LOGS),
  },

  // ── DEPENDENCY CHAIN 4: Tide Pool Deep Clean ──
  {
    id: 'algae_treatment_tide_pool',
    name: 'Algae_Treatment_Tide_Pool',
    status: 'failed',
    schedule: '0 10 * * 3',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ["Liam O'Brien"],
    location: '89 Tide Pool Ln, Fort Lauderdale FL 33301',
    tags: ['algae', 'treatment', 'recurring'],
    lastRun: hAgo(4),
    nextRun: h(164),
    duration: 0,
    avgDuration: 55,
    successRate: 70,
    createdAt: hAgo(180),
    dependsOn: [],
    runHistory: [
      {
        id: 'run-algae-1',
        startTime: hAgo(4),
        duration: 0,
        status: 'failed',
        log: '[10:00:00] Algae treatment started\n[10:05:00] ERROR: Crew no-show — Liam O\'Brien reported ill\n[10:06:00] Job failed — no available replacement crew\n[10:06:00] Alert sent to manager Aisha Thompson',
      },
      ...runs(hAgo(168), 5, 55, 70, ALGAE_LOGS),
    ],
  },
  {
    id: 'deep_clean_tide_pool',
    name: 'Monthly_Deep_Clean_Tide_Pool',
    status: 'queued',
    schedule: '0 13 * * 3',
    scheduleType: 'recurring',
    serviceType: 'Deep Clean',
    crew: ["Liam O'Brien", 'Devon Chang'],
    location: '89 Tide Pool Ln, Fort Lauderdale FL 33301',
    tags: ['deep-clean', 'monthly', 'recurring'],
    lastRun: hAgo(672),
    nextRun: h(168),
    duration: 0,
    avgDuration: 120,
    successRate: 83,
    createdAt: hAgo(180),
    dependsOn: ['algae_treatment_tide_pool'],
    runHistory: runs(hAgo(672), 4, 120, 83, DEEP_CLEAN_LOGS),
  },

  // ── STANDALONE RECURRING JOBS ──
  {
    id: 'weekly_maint_coral_reef',
    name: 'Weekly_Maintenance_Coral_Reef_Dr',
    status: 'completed',
    schedule: '0 8 * * 2',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Marcus Rivera'],
    location: '412 Coral Reef Dr, Miami FL 33101',
    tags: ['weekly', 'maintenance', 'recurring'],
    lastRun: hAgo(24),
    nextRun: h(144),
    duration: 58,
    avgDuration: 60,
    successRate: 96,
    createdAt: hAgo(400),
    dependsOn: [],
    runHistory: runs(hAgo(24), 9, 60, 96, MAINT_LOGS),
  },
  {
    id: 'water_test_coral_reef',
    name: 'Water_Test_Coral_Reef_Dr',
    status: 'completed',
    schedule: '0 10 * * 2',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Marcus Rivera'],
    location: '412 Coral Reef Dr, Miami FL 33101',
    tags: ['weekly', 'water-test', 'recurring'],
    lastRun: hAgo(22),
    nextRun: h(146),
    duration: 24,
    avgDuration: 25,
    successRate: 98,
    createdAt: hAgo(400),
    dependsOn: [],
    runHistory: runs(hAgo(22), 9, 25, 98, WATER_TEST_LOGS),
  },
  {
    id: 'filter_replacement_tide_pool',
    name: 'Filter_Replacement_Tide_Pool',
    status: 'completed',
    schedule: '0 14 1 * *',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Devon Chang'],
    location: '89 Tide Pool Ln, Fort Lauderdale FL 33301',
    tags: ['filter', 'monthly', 'recurring'],
    lastRun: hAgo(96),
    nextRun: h(624),
    duration: 45,
    avgDuration: 40,
    successRate: 91,
    createdAt: hAgo(300),
    dependsOn: [],
    runHistory: runs(hAgo(96), 7, 40, 91, MAINT_LOGS),
  },
  {
    id: 'weekly_maint_ocean_dr',
    name: 'Weekly_Maintenance_Ocean_Dr',
    status: 'completed',
    schedule: '0 9 * * 4',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Priya Nair'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['weekly', 'maintenance', 'recurring'],
    lastRun: hAgo(72),
    nextRun: h(96),
    duration: 67,
    avgDuration: 65,
    successRate: 93,
    createdAt: hAgo(500),
    dependsOn: [],
    runHistory: runs(hAgo(72), 8, 65, 93, MAINT_LOGS),
  },
  {
    id: 'substrate_replacement_mangrove',
    name: 'Substrate_Replacement_Mangrove',
    status: 'completed',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Installation',
    crew: ['Trent Wallace', 'Devon Chang'],
    location: '57 Mangrove Ave, Hollywood FL 33020',
    tags: ['substrate', 'installation', 'one-time'],
    lastRun: hAgo(36),
    nextRun: null,
    duration: 145,
    avgDuration: 150,
    successRate: 85,
    createdAt: hAgo(50),
    dependsOn: [],
    runHistory: runs(hAgo(36), 3, 150, 85, CORAL_LOGS),
  },
  {
    id: 'algae_treatment_boca',
    name: 'Algae_Treatment_Boca',
    status: 'completed',
    schedule: '0 11 * * 5',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Keisha Fontaine'],
    location: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    tags: ['algae', 'recurring'],
    lastRun: hAgo(60),
    nextRun: h(108),
    duration: 52,
    avgDuration: 50,
    successRate: 88,
    createdAt: hAgo(200),
    dependsOn: [],
    runHistory: runs(hAgo(60), 7, 50, 88, ALGAE_LOGS),
  },
  {
    id: 'water_test_mangrove',
    name: 'Water_Test_Mangrove_Ave',
    status: 'completed',
    schedule: '0 14 * * 5',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Trent Wallace'],
    location: '57 Mangrove Ave, Hollywood FL 33020',
    tags: ['water-test', 'recurring'],
    lastRun: hAgo(58),
    nextRun: h(110),
    duration: 27,
    avgDuration: 25,
    successRate: 96,
    createdAt: hAgo(200),
    dependsOn: [],
    runHistory: runs(hAgo(58), 7, 25, 96, WATER_TEST_LOGS),
  },
  {
    id: 'deep_clean_sailfish',
    name: 'Monthly_Deep_Clean_Sailfish',
    status: 'completed',
    schedule: '0 8 15 * *',
    scheduleType: 'recurring',
    serviceType: 'Deep Clean',
    crew: ['Keisha Fontaine', 'Priya Nair'],
    location: '95 Sailfish Ave, Key Largo FL 33037',
    tags: ['deep-clean', 'monthly'],
    lastRun: hAgo(480),
    nextRun: h(240),
    duration: 118,
    avgDuration: 120,
    successRate: 90,
    createdAt: hAgo(300),
    dependsOn: [],
    runHistory: runs(hAgo(480), 6, 120, 90, DEEP_CLEAN_LOGS),
  },
  {
    id: 'equip_delivery_key_largo',
    name: 'Equipment_Delivery_Key_Largo',
    status: 'failed',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Equipment Delivery',
    crew: ['Marcus Rivera'],
    location: '95 Sailfish Ave, Key Largo FL 33037',
    tags: ['delivery', 'one-time'],
    lastRun: hAgo(6),
    nextRun: null,
    duration: 0,
    avgDuration: 85,
    successRate: 67,
    createdAt: hAgo(10),
    dependsOn: [],
    runHistory: [
      {
        id: 'run-kl-1',
        startTime: hAgo(6),
        duration: 0,
        status: 'failed',
        log: '[07:00:00] Equipment delivery started\n[07:30:00] En route — Highway 1 southbound\n[08:15:00] ERROR: Vehicle breakdown — alternator failure\n[08:16:00] Roadside assistance called\n[08:20:00] Job failed — delivery rescheduled\n[08:21:00] Alert sent to Sofia Morales',
      },
      ...runs(hAgo(240), 4, 85, 67, DELIVERY_LOGS),
    ],
  },
  {
    id: 'tank_install_coral_reef',
    name: 'Tank_Install_Coral_Reef_Dr',
    status: 'completed',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Installation',
    crew: ['Marcus Rivera', 'Priya Nair'],
    location: '412 Coral Reef Dr, Miami FL 33101',
    tags: ['installation', 'reef', 'one-time'],
    lastRun: hAgo(168),
    nextRun: null,
    duration: 215,
    avgDuration: 210,
    successRate: 88,
    createdAt: hAgo(200),
    dependsOn: [],
    runHistory: runs(hAgo(168), 5, 210, 88, CORAL_LOGS),
  },
  {
    id: 'weekly_maint_sailfish',
    name: 'Weekly_Maintenance_Sailfish_Ave',
    status: 'completed',
    schedule: '0 10 * * 6',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Devon Chang'],
    location: '95 Sailfish Ave, Key Largo FL 33037',
    tags: ['weekly', 'maintenance'],
    lastRun: hAgo(96),
    nextRun: h(72),
    duration: 63,
    avgDuration: 60,
    successRate: 92,
    createdAt: hAgo(350),
    dependsOn: [],
    runHistory: runs(hAgo(96), 8, 60, 92, MAINT_LOGS),
  },
  {
    id: 'water_test_palmetto',
    name: 'Water_Test_Palmetto_Park',
    status: 'running',
    schedule: '0 8 * * 3',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Trent Wallace'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['water-test', 'recurring'],
    lastRun: hAgo(0.5),
    nextRun: h(167),
    duration: 30,
    avgDuration: 25,
    successRate: 94,
    createdAt: hAgo(300),
    dependsOn: [],
    runHistory: runs(hAgo(0.5), 7, 25, 94, WATER_TEST_LOGS),
  },
  {
    id: 'deep_clean_blue_lagoon',
    name: 'Monthly_Deep_Clean_Blue_Lagoon',
    status: 'completed',
    schedule: '0 8 20 * *',
    scheduleType: 'recurring',
    serviceType: 'Deep Clean',
    crew: ['Keisha Fontaine'],
    location: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
    tags: ['deep-clean', 'monthly'],
    lastRun: hAgo(360),
    nextRun: h(360),
    duration: 116,
    avgDuration: 120,
    successRate: 87,
    createdAt: hAgo(400),
    dependsOn: [],
    runHistory: runs(hAgo(360), 6, 120, 87, DEEP_CLEAN_LOGS),
  },
  {
    id: 'algae_treatment_mangrove',
    name: 'Algae_Treatment_Mangrove',
    status: 'completed',
    schedule: '0 13 * * 0',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ["Liam O'Brien"],
    location: '57 Mangrove Ave, Hollywood FL 33020',
    tags: ['algae', 'recurring'],
    lastRun: hAgo(120),
    nextRun: h(48),
    duration: 48,
    avgDuration: 50,
    successRate: 84,
    createdAt: hAgo(250),
    dependsOn: [],
    runHistory: runs(hAgo(120), 6, 50, 84, ALGAE_LOGS),
  },
  {
    id: 'filter_replacement_ocean',
    name: 'Filter_Replacement_Ocean_Dr',
    status: 'completed',
    schedule: '0 11 1 * *',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Priya Nair'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['filter', 'monthly'],
    lastRun: hAgo(240),
    nextRun: h(480),
    duration: 42,
    avgDuration: 40,
    successRate: 93,
    createdAt: hAgo(350),
    dependsOn: [],
    runHistory: runs(hAgo(240), 7, 40, 93, MAINT_LOGS),
  },
  {
    id: 'emergency_repair_palmetto',
    name: 'Emergency_Leak_Repair_Palmetto',
    status: 'failed',
    schedule: 'Event-triggered',
    scheduleType: 'event_triggered',
    serviceType: 'Emergency Repair',
    crew: ['Devon Chang', 'Trent Wallace'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['emergency', 'leak'],
    lastRun: hAgo(12),
    nextRun: null,
    duration: 0,
    avgDuration: 90,
    successRate: 75,
    createdAt: hAgo(12),
    dependsOn: [],
    runHistory: [
      {
        id: 'run-ep-1',
        startTime: hAgo(12),
        duration: 0,
        status: 'failed',
        log: '[22:15:00] Emergency repair triggered\n[22:16:00] Crew dispatched: Devon Chang, Trent Wallace\n[22:45:00] On site\n[23:00:00] ERROR: Plumbing behind wall — requires licensed plumber\n[23:05:00] Job escalated — outside scope\n[23:06:00] Homeowner notified',
      },
      ...runs(hAgo(500), 4, 90, 75, EMERGENCY_LOGS),
    ],
  },
  {
    id: 'weekly_maint_mangrove',
    name: 'Weekly_Maintenance_Mangrove_Ave',
    status: 'running',
    schedule: '0 11 * * 1',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ["Liam O'Brien"],
    location: '57 Mangrove Ave, Hollywood FL 33020',
    tags: ['weekly', 'maintenance'],
    lastRun: hAgo(0.75),
    nextRun: h(167),
    duration: 45,
    avgDuration: 60,
    successRate: 90,
    createdAt: hAgo(450),
    dependsOn: [],
    runHistory: runs(hAgo(0.75), 8, 60, 90, MAINT_LOGS),
  },
  {
    id: 'water_test_sailfish',
    name: 'Water_Test_Sailfish_Ave',
    status: 'completed',
    schedule: '0 12 * * 6',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Devon Chang'],
    location: '95 Sailfish Ave, Key Largo FL 33037',
    tags: ['water-test', 'recurring'],
    lastRun: hAgo(90),
    nextRun: h(78),
    duration: 23,
    avgDuration: 25,
    successRate: 97,
    createdAt: hAgo(350),
    dependsOn: [],
    runHistory: runs(hAgo(90), 8, 25, 97, WATER_TEST_LOGS),
  },
  {
    id: 'deep_clean_ocean',
    name: 'Monthly_Deep_Clean_Ocean_Dr',
    status: 'completed',
    schedule: '0 9 10 * *',
    scheduleType: 'recurring',
    serviceType: 'Deep Clean',
    crew: ['Priya Nair', 'Marcus Rivera'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['deep-clean', 'monthly'],
    lastRun: hAgo(600),
    nextRun: h(120),
    duration: 125,
    avgDuration: 120,
    successRate: 91,
    createdAt: hAgo(500),
    dependsOn: [],
    runHistory: runs(hAgo(600), 6, 120, 91, DEEP_CLEAN_LOGS),
  },
  {
    id: 'weekly_maint_palmetto',
    name: 'Weekly_Maintenance_Palmetto',
    status: 'completed',
    schedule: '0 9 * * 5',
    scheduleType: 'recurring',
    serviceType: 'Maintenance',
    crew: ['Trent Wallace'],
    location: '340 Palmetto Park Rd, Coral Springs FL 33071',
    tags: ['weekly', 'maintenance'],
    lastRun: hAgo(144),
    nextRun: h(24),
    duration: 61,
    avgDuration: 60,
    successRate: 92,
    createdAt: hAgo(400),
    dependsOn: [],
    runHistory: runs(hAgo(144), 8, 60, 92, MAINT_LOGS),
  },
  {
    id: 'substrate_replacement_coral_reef',
    name: 'Substrate_Replacement_Coral_Reef',
    status: 'completed',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Installation',
    crew: ['Marcus Rivera', 'Devon Chang'],
    location: '412 Coral Reef Dr, Miami FL 33101',
    tags: ['substrate', 'installation'],
    lastRun: hAgo(336),
    nextRun: null,
    duration: 155,
    avgDuration: 150,
    successRate: 86,
    createdAt: hAgo(340),
    dependsOn: [],
    runHistory: runs(hAgo(336), 4, 150, 86, CORAL_LOGS),
  },
  {
    id: 'water_test_mangrove_monthly',
    name: 'Monthly_Water_Test_Mangrove',
    status: 'completed',
    schedule: '0 15 5 * *',
    scheduleType: 'recurring',
    serviceType: 'Water Testing',
    crew: ['Keisha Fontaine'],
    location: '57 Mangrove Ave, Hollywood FL 33020',
    tags: ['water-test', 'monthly'],
    lastRun: hAgo(384),
    nextRun: h(336),
    duration: 28,
    avgDuration: 25,
    successRate: 95,
    createdAt: hAgo(400),
    dependsOn: [],
    runHistory: runs(hAgo(384), 6, 25, 95, WATER_TEST_LOGS),
  },
  {
    id: 'equip_delivery_ocean',
    name: 'Equipment_Delivery_Ocean_Dr',
    status: 'running',
    schedule: 'One-time',
    scheduleType: 'one_time',
    serviceType: 'Equipment Delivery',
    crew: ['Trent Wallace'],
    location: '1801 Ocean Dr, Miami Beach FL 33139',
    tags: ['delivery', 'one-time'],
    lastRun: hAgo(1),
    nextRun: null,
    duration: 60,
    avgDuration: 85,
    successRate: 80,
    createdAt: hAgo(5),
    dependsOn: [],
    runHistory: runs(hAgo(1), 3, 85, 80, DELIVERY_LOGS),
  },
];

export const SCHEDULER_WORKFLOWS: SchedulerWorkflow[] = [
  {
    id: 'wf_palmetto_install',
    name: 'Palmetto Park Full Install',
    jobIds: [
      'equip_delivery_palmetto',
      'tank_install_coral_springs',
      'water_test_coral_springs',
      'client_walkthrough_coral_springs',
    ],
  },
  {
    id: 'wf_ocean_emergency',
    name: 'Ocean Dr Emergency Response',
    jobIds: ['emergency_leak_ocean', 'water_test_ocean_followup'],
  },
  {
    id: 'wf_blue_lagoon_weekly',
    name: 'Blue Lagoon Weekly Cycle',
    jobIds: ['weekly_maint_blue_lagoon', 'water_test_blue_lagoon', 'report_blue_lagoon'],
  },
  {
    id: 'wf_tide_pool_clean',
    name: 'Tide Pool Deep Clean Cycle',
    jobIds: ['algae_treatment_tide_pool', 'deep_clean_tide_pool'],
  },
];

export function getSchedulerStats(jobs: SchedulerJob[]) {
  return {
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    queued: jobs.filter((j) => j.status === 'queued').length,
    slaAtRisk: jobs.filter((j) => j.status === 'sla_at_risk').length,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatRelative(date: Date | null): string {
  if (!date) return 'Never';
  const diffMs = Date.now() - date.getTime() + (new Date('2026-05-05T10:30:00').getTime() - Date.now());
  const diffMins = Math.floor(Math.abs(diffMs) / 60_000);
  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export function formatRelativeFuture(date: Date | null): string {
  if (!date) return '—';
  const diffMs = date.getTime() - new Date('2026-05-05T10:30:00').getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 0) return 'Overdue';
  if (diffMins < 60) return `in ${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `in ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `in ${diffDays}d`;
}
