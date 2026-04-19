'use client';

import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useDashboard } from '@/context/DashboardContext';

export function TimesheetView() {
  const { timesheets, isLoading } = useDashboard();

  const sorted = [...timesheets].sort(
    (a, b) => new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime()
  );

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Clock className="h-4 w-4 text-indigo-500" />
          Timesheets
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-xs text-gray-400">Worker</TableHead>
              <TableHead className="text-xs text-gray-400">Punch In</TableHead>
              <TableHead className="text-xs text-gray-400">Punch Out</TableHead>
              <TableHead className="text-xs text-gray-400">Total Hours</TableHead>
              <TableHead className="text-xs text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-100">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-gray-200" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map((record) => (
                  <TableRow key={record.id} className="border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-800">{record.workerName}</TableCell>
                    <TableCell className="text-gray-500">{format(new Date(record.punchIn), 'h:mm a')}</TableCell>
                    <TableCell className="text-gray-500">{record.punchOut ? format(new Date(record.punchOut), 'h:mm a') : '—'}</TableCell>
                    <TableCell className="text-gray-700">{record.totalHours != null ? `${record.totalHours.toFixed(2)} hrs` : '—'}</TableCell>
                    <TableCell>
                      {record.punchOut
                        ? <Badge className="border-0 bg-gray-100 text-gray-500">Complete</Badge>
                        : <Badge className="border-0 bg-emerald-100 text-emerald-700">Active</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
