// Chart theming configuration tied to global CSS custom properties

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

// Semantic status colors for job scheduler and other status indicators
export const STATUS_COLORS = {
  running: { bg: 'var(--chart-2)', text: '#ffffff' }, // cyan
  completed: { bg: 'var(--chart-1)', text: '#ffffff' }, // teal
  failed: { bg: 'var(--destructive)', text: '#ffffff' }, // red
  queued: { bg: 'var(--muted-foreground)', text: '#ffffff' }, // gray
  sla_at_risk: { bg: 'var(--chart-4)', text: '#ffffff' }, // amber
} as const;

// Chart color schemes for different chart types
export const CHART_COLOR_SCHEMES = {
  // Multi-series line chart colors
  line: CHART_COLORS.slice(0, 4),
  // Status-based bar chart
  status: [
    STATUS_COLORS.completed.bg, // completed
    STATUS_COLORS.running.bg, // running
    STATUS_COLORS.failed.bg, // failed
  ],
  // Category-based colors
  channel: {
    'IN-STORE': CHART_COLORS[0],
    'ONLINE': CHART_COLORS[1],
    'AGENT': CHART_COLORS[3],
    'B2B': CHART_COLORS[4],
  },
} as const;

// Tooltip styling configuration
export const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
  },
  labelStyle: {
    color: 'var(--muted-foreground)',
  },
} as const;
