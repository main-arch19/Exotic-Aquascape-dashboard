'use client';

import { Briefcase, Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

function KPICard({ label, value, icon, accent }: KPICardProps) {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KPICard
        label="Active Jobs Today"
        value={5}
        icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
        accent="bg-indigo-50"
      />
      <KPICard
        label="Tools Checked Out"
        value={5}
        icon={<Wrench className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-50"
      />
      <KPICard
        label="Delays Reported"
        value={5}
        icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        accent="bg-amber-50"
      />
    </div>
  );
}
