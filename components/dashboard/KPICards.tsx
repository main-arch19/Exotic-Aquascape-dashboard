'use client';

import { useEffect, useRef } from 'react';
import { Briefcase, Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboard } from '@/context/DashboardContext';

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

function KPICard({ label, value, icon, accent }: KPICardProps) {
  const displayRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!displayRef.current) return;

    const el = displayRef.current;
    const start = Date.now();
    const duration = 600;

    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.floor(progress * value).toString();

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [value]);

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
          <p ref={displayRef} className="text-3xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards() {
  const { kpis } = useDashboard();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KPICard
        label="Active Jobs Today"
        value={kpis.activeJobs}
        icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
        accent="bg-indigo-50"
      />
      <KPICard
        label="Tools Checked Out"
        value={kpis.toolsCheckedOut}
        icon={<Wrench className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-50"
      />
      <KPICard
        label="Delays Reported"
        value={kpis.delaysToday}
        icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        accent="bg-amber-50"
      />
    </div>
  );
}
