'use client';

import { Wrench, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const EXAMPLES = [
  { id: '1', name: 'Siphon Vacuum Pro',      category: 'Cleaning',   heldBy: 'Marcus Rivera',   since: '2h ago' },
  { id: '2', name: 'API Water Test Kit',     category: 'Testing',    heldBy: 'Priya Nair',      since: '2h ago' },
  { id: '3', name: 'Canister Filter',        category: 'Equipment',  heldBy: 'Devon Chang',     since: '1h ago' },
  { id: '4', name: 'Aquarium Net Bag',       category: 'Handling',   heldBy: 'Trent Wallace',   since: '45m ago' },
  { id: '5', name: 'Magnetic Glass Cleaner', category: 'Cleaning',   heldBy: 'Keisha Fontaine', since: '40m ago' },
];

export function ToolsCheckedOutSection() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
          <Wrench className="h-4 w-4 text-sky-500" />
          Tools Checked Out
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-gray-400">{EXAMPLES.length} out</span>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gray-100" />
      <CardContent className="divide-y divide-gray-100 p-0">
        {EXAMPLES.map((tool) => (
          <div key={tool.id} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <User className="h-3 w-3" />
                {tool.heldBy}
                <span className="text-gray-300 mx-1">·</span>
                {tool.since}
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
