'use client';

import { Activity, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type Severity = 'info' | 'warning' | 'success';

const EXAMPLES: { id: string; message: string; time: string; severity: Severity }[] = [
  { id: '1', message: 'Priya Nair reported delay: Equipment malfunction on site',         time: '9:57 AM', severity: 'warning' },
  { id: '2', message: "Liam O'Brien is leaving site — job wrapping up",                   time: '9:45 AM', severity: 'info'    },
  { id: '3', message: 'Keisha Fontaine arrived at 1801 Ocean Dr',                         time: '9:19 AM', severity: 'success' },
  { id: '4', message: 'Trent Wallace arrived at 1801 Ocean Dr',                           time: '9:18 AM', severity: 'success' },
  { id: '5', message: 'Devon Chang reported delay: Flat tire on US-1, tow truck en route',time: '9:38 AM', severity: 'warning' },
];

function icon(severity: Severity) {
  switch (severity) {
    case 'success': return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
    default:        return <Info className="h-4 w-4 shrink-0 text-gray-400" />;
  }
}

function dot(severity: Severity) {
  switch (severity) {
    case 'success': return 'bg-emerald-400';
    case 'warning': return 'bg-amber-400';
    default:        return 'bg-gray-300';
  }
}

export function LiveActivitySection() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Activity className="h-4 w-4 text-indigo-500" />
          Live Activity
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal normal-case tracking-normal text-emerald-600">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Real-time
          </span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {EXAMPLES.map((e) => (
          <div key={e.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot(e.severity)}`} />
            {icon(e.severity)}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 leading-snug">{e.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">{e.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
