'use client';

import { MapPin, Eye, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CONSENT_VERSION } from '@/lib/tracking/types';

export const CONSENT_STORAGE_KEY = `ea:tracking:consent:${CONSENT_VERSION}`;

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function storeConsent() {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Storage disabled. The per-trip DB record is the one that matters; this
    // only means the worker will be asked again next time.
  }
}

interface ConsentDialogProps {
  open: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

/**
 * One-time consent gate.
 *
 * Consent is recorded twice, deliberately: localStorage controls whether this
 * modal appears (a UX concern), while field_trips.consent_granted_at +
 * consent_version is the durable per-trip record (a legal one). "They affirmed
 * consent at 09:04 on this specific trip" is a far stronger artifact than "they
 * ticked a box once in March."
 */
export function ConsentDialog({ open, onAgree, onCancel }: ConsentDialogProps) {
  const points = [
    {
      icon: MapPin,
      title: 'What is collected',
      body: 'Your location, along with its accuracy, your speed, and your phone’s battery level.',
    },
    {
      icon: Clock,
      title: 'When',
      body: 'Only while a trip you started is running. Ending the trip stops it immediately. Nothing is collected off the clock.',
    },
    {
      icon: Eye,
      title: 'Who can see it',
      body: 'Managers and the CEO. Other field workers cannot see your location.',
    },
    {
      icon: Trash2,
      title: 'How long it is kept',
      body: 'Routes are deleted after 30 days.',
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // No click-away dismissal: this is an affirmative consent gate, and a
      // modal you can wave away by tapping the backdrop is not consent. Escape
      // still closes, which routes to onCancel and simply starts no trip —
      // failing closed is the correct outcome for a consent prompt.
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your location during trips</DialogTitle>
          <DialogDescription>
            Before your first trip, here is exactly what this does.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          You can end a trip at any time, and location sharing stops the moment you
          do. While a trip is running you will always see an indicator at the top of
          your screen.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Not now
          </Button>
          <Button onClick={onAgree}>I agree</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
