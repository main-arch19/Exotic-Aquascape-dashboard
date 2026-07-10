'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface SectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  accent?: 'default' | 'primary' | 'destructive' | 'amber' | 'emerald';
  hover?: boolean;
}

const accentColors = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

const SectionContent = React.forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      title,
      icon,
      children,
      collapsible = false,
      defaultOpen = true,
      accent = 'default',
      hover = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(defaultOpen);

    if (collapsible) {
      return (
        <Card
          ref={ref}
          className={cn(
            'transition-all duration-200 overflow-hidden',
            hover && 'hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            {icon && (
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accentColors[accent])}>
                {icon}
              </div>
            )}
            {title && <span className="text-sm font-semibold text-foreground">{title}</span>}
            <span className="ml-auto text-muted-foreground">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>
          {open && (
            <div className="border-t border-border">
              <CardContent className="pt-4">{children}</CardContent>
            </div>
          )}
        </Card>
      );
    }

    return (
      <Card
        ref={ref}
        className={cn(
          'transition-all duration-200',
          hover && 'hover:shadow-md hover:-translate-y-0.5'
        )}
      >
        {(title || icon) && (
          <CardHeader>
            <div className="flex items-center gap-3">
              {icon && (
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    accentColors[accent]
                  )}
                >
                  {icon}
                </div>
              )}
              {title && <CardTitle>{title}</CardTitle>}
            </div>
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
      </Card>
    );
  }
);

SectionContent.displayName = 'Section';

export const Section = SectionContent;
