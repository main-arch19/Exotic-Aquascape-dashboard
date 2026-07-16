'use client';

import { Wrench, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDashboard } from '@/context/DashboardContext';

function since(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

export function ToolsCheckedOutSection() {
  const { tools } = useDashboard();
  const checkedOut = tools.filter((t) => t.status === 'checked_out');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Wrench className="h-4 w-4 text-sky-500" />
          Tools Checked Out
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-gray-400">{checkedOut.length} out</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {checkedOut.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No tools checked out.</p>
        )}
        {checkedOut.map((tool) => (
          <div key={tool.id} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <User className="h-3 w-3" />
                {tool.checkedOutByName ?? 'Unknown'}
                {since(tool.checkedOutAt) && (
                  <>
                    <span className="text-gray-300 mx-1">·</span>
                    {since(tool.checkedOutAt)}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="border-0 bg-gray-100 text-gray-500 text-xs">{tool.category}</Badge>
              <Badge className="border-0 bg-amber-100 text-amber-700 text-xs">Out</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
