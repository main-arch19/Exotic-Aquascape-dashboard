'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/context/DashboardContext';
import { EventLog } from '@/lib/types';

function severityIcon(severity: EventLog['severity']) {
  switch (severity) {
    case 'success':
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />;
    case 'warning':
      return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
    default:
      return <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />;
  }
}

function severityDot(severity: EventLog['severity']) {
  switch (severity) {
    case 'success': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-400';
    default:        return 'bg-gray-300';
  }
}

export function LiveActivityFeed() {
  const { events, isLoading } = useDashboard();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-4">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No activity yet…</p>
        )}
        {sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
          >
            {severityIcon(event.severity)}
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-gray-800">{event.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {format(new Date(event.timestamp), 'h:mm:ss a')}
              </p>
            </div>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot(event.severity)}`} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
