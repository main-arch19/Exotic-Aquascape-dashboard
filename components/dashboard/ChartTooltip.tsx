import { TOOLTIP_STYLE } from '@/lib/chart-theme';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string;
    name?: string;
    value?: number | string;
    payload?: Record<string, any>;
  }>;
  label?: string;
  formatter?: (value: any) => string;
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div
      style={{
        ...TOOLTIP_STYLE.contentStyle,
        padding: '8px 12px',
      } as React.CSSProperties}
    >
      {label && (
        <p style={{ ...TOOLTIP_STYLE.labelStyle, marginBottom: '4px' } as React.CSSProperties}>
          {label}
        </p>
      )}
      {payload.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: idx === payload.length - 1 ? 0 : '4px' }}>
          {entry.color && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: entry.color,
                marginTop: '3px',
              }}
            />
          )}
          <div>
            <span style={{ marginRight: '4px', fontWeight: 500 }}>
              {entry.name || entry.dataKey}:
            </span>
            <span>{formatter ? formatter(entry.value) : entry.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
