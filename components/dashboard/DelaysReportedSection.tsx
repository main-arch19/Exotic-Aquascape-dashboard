'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const EXAMPLES = [
  { id: '1', worker: 'Devon Chang',     reason: 'Heavy traffic on I-95 near exit 12',       time: '3m ago'  },
  { id: '2', worker: "Liam O'Brien",    reason: 'Waiting for gate code from homeowner',       time: '2m ago'  },
  { id: '3', worker: 'Priya Nair',      reason: 'Equipment malfunction on site',              time: '1m ago'  },
  { id: '4', worker: 'Devon Chang',     reason: 'Flat tire on US-1, tow truck en route',      time: '22m ago' },
  { id: '5', worker: 'Devon Chang',     reason: 'Waiting for tow truck — still delayed',      time: '3m ago'  },
];

export function DelaysReportedSection() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Delays Reported
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-amber-500">{EXAMPLES.length} active</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {EXAMPLES.map((d) => (
          <div key={d.id} className="flex items-start gap-3 p-4 hover:bg-amber-50/40 transition-colors">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{d.worker}</p>
                <Badge className="border-0 bg-amber-100 text-amber-700 text-xs">Delayed</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{d.reason}</p>
            </div>
            <p className="shrink-0 text-xs text-gray-400">{d.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
