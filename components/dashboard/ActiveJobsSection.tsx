'use client';

import { Briefcase, Clock, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type JobStatus = 'in_progress' | 'delayed' | 'scheduled' | 'completed';

const EXAMPLES: {
  id: string;
  homeowner: string;
  address: string;
  workers: string;
  time: string;
  status: JobStatus;
}[] = [
  { id: '1', homeowner: 'Evelyn Hart',      address: '412 Coral Reef Dr, Miami FL',            workers: 'Marcus Rivera, Priya Nair', time: '9:00 AM',  status: 'in_progress' },
  { id: '2', homeowner: 'Nathan Brooks',     address: '89 Tide Pool Ln, Fort Lauderdale FL',    workers: 'Devon Chang',              time: '10:30 AM', status: 'delayed'     },
  { id: '3', homeowner: 'Rosa Kim',          address: '1801 Ocean Dr, Miami Beach FL',          workers: 'Trent Wallace, K. Fontaine',time: '11:00 AM', status: 'in_progress' },
  { id: '4', homeowner: 'Carla Vega',        address: '230 Blue Lagoon Blvd, Boca Raton FL',   workers: 'Aisha Thompson',           time: '1:00 PM',  status: 'scheduled'   },
  { id: '5', homeowner: 'Derek Osei',        address: '340 Palmetto Park Rd, Coral Springs FL', workers: 'Liam O\'Brien',           time: '2:30 PM',  status: 'scheduled'   },
];

function statusBadge(status: JobStatus) {
  switch (status) {
    case 'in_progress': return <Badge className="border-0 bg-emerald-100 text-emerald-700">In Progress</Badge>;
    case 'delayed':     return <Badge className="border-0 bg-amber-100 text-amber-700">Delayed</Badge>;
    case 'scheduled':   return <Badge className="border-0 bg-indigo-100 text-indigo-700">Scheduled</Badge>;
    case 'completed':   return <Badge className="border-0 bg-gray-100 text-gray-500">Completed</Badge>;
  }
}

export function ActiveJobsSection() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Briefcase className="h-4 w-4 text-indigo-500" />
          Active Jobs Today
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-gray-400">{EXAMPLES.length} jobs</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {EXAMPLES.map((job) => (
          <div key={job.id} className="flex flex-col gap-2 p-4 hover:bg-gray-50 transition-colors sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{job.homeowner}</p>
                {statusBadge(job.status)}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.workers}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <Clock className="h-3 w-3" />{job.time}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
