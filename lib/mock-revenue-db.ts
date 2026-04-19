export type Parish =
  | 'Kingston'
  | 'St. Andrew'
  | 'St. Thomas'
  | 'Portland'
  | 'St. Mary'
  | 'St. Ann'
  | 'Trelawny'
  | 'St. James'
  | 'Hanover'
  | 'Westmoreland'
  | 'St. Elizabeth'
  | 'Manchester'
  | 'Clarendon'
  | 'St. Catherine';

export type SalesChannel = 'IN-STORE' | 'ONLINE' | 'AGENT' | 'B2B';
export type TransactionType = 'SALE' | 'REFUND';

export interface Transaction {
  id: string;
  date: string;
  parish: Parish;
  channel: SalesChannel;
  type: TransactionType;
  grossAmount: number;
  refundAmount: number;
  netAmount: number;
}

export const PARISHES: Parish[] = [
  'Kingston', 'St. Andrew', 'St. Catherine', 'St. James', 'Manchester',
  'Clarendon', 'St. Ann', 'Westmoreland', 'St. Elizabeth', 'Portland',
  'St. Mary', 'Trelawny', 'Hanover', 'St. Thomas',
];

const CHANNELS: SalesChannel[] = ['IN-STORE', 'ONLINE', 'AGENT', 'B2B'];

// Seeded LCG PRNG for deterministic data
function makePrng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface ParishConfig {
  tier: 'large' | 'medium' | 'small';
  baseAOV: number;
  txPerMonth: [number, number];
  growthTrend: number; // monthly multiplier, e.g. 0.04 = +4%
  refundRate: number;  // fraction e.g. 0.05
  channelWeights: [number, number, number, number]; // IN-STORE ONLINE AGENT B2B
}

const PARISH_CONFIGS: Record<Parish, ParishConfig> = {
  'Kingston':      { tier: 'large',  baseAOV: 32000, txPerMonth: [90, 120], growthTrend: 0.015,  refundRate: 0.04, channelWeights: [0.15, 0.45, 0.15, 0.25] },
  'St. Andrew':    { tier: 'large',  baseAOV: 29000, txPerMonth: [85, 115], growthTrend: 0.012,  refundRate: 0.035, channelWeights: [0.25, 0.35, 0.20, 0.20] },
  'St. Catherine': { tier: 'large',  baseAOV: 27000, txPerMonth: [80, 110], growthTrend: 0.018,  refundRate: 0.045, channelWeights: [0.35, 0.25, 0.25, 0.15] },
  'St. James':     { tier: 'medium', baseAOV: 21000, txPerMonth: [60, 80],  growthTrend: 0.040,  refundRate: 0.03, channelWeights: [0.20, 0.20, 0.20, 0.40] },
  'Manchester':    { tier: 'medium', baseAOV: 18000, txPerMonth: [55, 75],  growthTrend: 0.010,  refundRate: 0.05, channelWeights: [0.40, 0.20, 0.25, 0.15] },
  'Clarendon':     { tier: 'medium', baseAOV: 16000, txPerMonth: [50, 70],  growthTrend: 0.008,  refundRate: 0.055, channelWeights: [0.45, 0.15, 0.30, 0.10] },
  'St. Ann':       { tier: 'small',  baseAOV: 14000, txPerMonth: [35, 50],  growthTrend: 0.025,  refundRate: 0.06, channelWeights: [0.30, 0.25, 0.35, 0.10] },
  'Westmoreland':  { tier: 'small',  baseAOV: 12000, txPerMonth: [30, 48],  growthTrend: 0.005,  refundRate: 0.065, channelWeights: [0.50, 0.10, 0.30, 0.10] },
  'St. Elizabeth': { tier: 'small',  baseAOV: 11500, txPerMonth: [28, 45],  growthTrend: 0.007,  refundRate: 0.05, channelWeights: [0.55, 0.10, 0.25, 0.10] },
  'Portland':      { tier: 'small',  baseAOV: 10000, txPerMonth: [22, 38],  growthTrend: -0.005, refundRate: 0.07, channelWeights: [0.60, 0.05, 0.30, 0.05] },
  'St. Mary':      { tier: 'small',  baseAOV: 10500, txPerMonth: [25, 40],  growthTrend: 0.003,  refundRate: 0.06, channelWeights: [0.55, 0.10, 0.25, 0.10] },
  'Trelawny':      { tier: 'small',  baseAOV: 11000, txPerMonth: [25, 42],  growthTrend: 0.015,  refundRate: 0.055, channelWeights: [0.50, 0.15, 0.25, 0.10] },
  'Hanover':       { tier: 'small',  baseAOV: 10000, txPerMonth: [20, 35],  growthTrend: 0.004,  refundRate: 0.065, channelWeights: [0.55, 0.10, 0.28, 0.07] },
  'St. Thomas':    { tier: 'small',  baseAOV: 9500,  txPerMonth: [20, 35],  growthTrend: -0.020, refundRate: 0.08, channelWeights: [0.60, 0.05, 0.30, 0.05] },
};

function pickWeighted(weights: [number, number, number, number], rng: () => number): SalesChannel {
  const r = rng();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r < sum) return CHANNELS[i];
  }
  return CHANNELS[3];
}

// Returns "YYYY-MM" string
export function offsetYearMonth(ym: string, offsetMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + offsetMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getLatestYearMonth(txs: Transaction[]): string {
  if (!txs.length) return '2026-04';
  return txs.reduce((max, t) => {
    const ym = t.date.slice(0, 7);
    return ym > max ? ym : max;
  }, '2024-03');
}

export function sumNetRevForParishMonth(txs: Transaction[], parish: Parish, ym: string): number {
  return txs
    .filter(t => t.parish === parish && t.date.slice(0, 7) === ym && t.type === 'SALE')
    .reduce((s, t) => s + t.netAmount, 0);
}

function generateTransactions(): Transaction[] {
  const rng = makePrng(0xdeadbeef);
  const txs: Transaction[] = [];
  let idCounter = 0;

  // 25 months: March 2024 → April 2026
  const START_YEAR = 2024, START_MONTH = 3;
  const TOTAL_MONTHS = 25;

  for (let mo = 0; mo < TOTAL_MONTHS; mo++) {
    const date = new Date(START_YEAR, START_MONTH - 1 + mo, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const parish of PARISHES) {
      const cfg = PARISH_CONFIGS[parish];
      const growthMultiplier = Math.pow(1 + cfg.growthTrend, mo);
      const [minTx, maxTx] = cfg.txPerMonth;
      const txCount = Math.round(minTx + rng() * (maxTx - minTx));

      for (let i = 0; i < txCount; i++) {
        const day = Math.ceil(rng() * daysInMonth);
        const dateStr = `${ym}-${String(day).padStart(2, '0')}`;
        const channel = pickWeighted(cfg.channelWeights, rng);
        const isRefund = rng() < cfg.refundRate;
        const type: TransactionType = isRefund ? 'REFUND' : 'SALE';
        const aovVariance = 0.6 + rng() * 0.8; // 0.6x to 1.4x
        const gross = Math.round(cfg.baseAOV * growthMultiplier * aovVariance / 100) * 100;
        const discount = Math.round(gross * (rng() < 0.3 ? rng() * 0.15 : 0) / 100) * 100;
        const tax = Math.round(gross * 0.15 / 100) * 100; // 15% GCT
        const net = gross - discount + tax;
        const refundAmt = isRefund ? net : 0;

        txs.push({
          id: `TX-${String(++idCounter).padStart(6, '0')}`,
          date: dateStr,
          parish,
          channel,
          type,
          grossAmount: gross,
          refundAmount: refundAmt,
          netAmount: isRefund ? 0 : net,
        });
      }
    }
  }

  return txs;
}

export const ALL_TRANSACTIONS: Transaction[] = generateTransactions();

export function getAllTransactions(): Transaction[] {
  return ALL_TRANSACTIONS;
}
