'use client';

import { MapPin, Eye, Clock, Trash2, SignalHigh } from 'lucide-react';
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

export function hasSeenNotice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function markNoticeSeen() {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Storage disabled. The per-trip DB record is the one that matters; this
    // only means the agent sees the notice again next time.
  }
}

interface ConsentDialogProps {
  open: boolean;
  jobLabel?: string;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * Location-sharing DISCLOSURE NOTICE, shown once per notice version before an
 * agent's first job acceptance.
 *
 * This is deliberately not framed as consent. Sharing is a condition of
 * accepting dispatched work and the agent cannot switch it off mid-job, so
 * calling it consent — and offering an "I agree" button over a mechanism with no
 * withdrawal — would misdescribe what is happening. What the agent does here is
 * read the terms and choose whether to take the job.
 *
 * The record is still kept twice: localStorage decides whether this dialog
 * appears (UX), while field_trips.consent_granted_at + consent_version is the
 * durable per-trip record of which notice text was actually shown (the artifact
 * that matters if this is ever questioned). The server rejects an accept
 * carrying a stale version, so the two cannot drift.
 */
export function ConsentDialog({
  open,
  jobLabel,
  onAccept,
  onCancel,
}: ConsentDialogProps) {
  const points = [
    {
      icon: MapPin,
      title: 'What is collected',
      body: 'Your location, along with its accuracy, your speed, and your phone’s battery level.',
    },
    {
      icon: Clock,
      title: 'When',
      body: 'From the moment you accept a job until you mark it complete — the drive there and your time on site. Nothing is collected before you accept, after you complete, or while you’re clocked out.',
    },
    {
      icon: SignalHigh,
      title: 'How well it works',
      body: 'This only works while the app is open on your screen. If you lock your phone or switch apps, sharing pauses and there will be gaps in your route.',
    },
    {
      icon: Eye,
      title: 'Who can see it',
      body: 'Managers and the CEO. Other field agents cannot see your location.',
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
      // No click-away dismissal. Escape still closes, which routes to onCancel
      // and simply starts no trip — failing closed is the right outcome.
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Location sharing on dispatched jobs</DialogTitle>
          <DialogDescription>
            Sharing your location is part of accepting a dispatched job. If you
            accept, it runs until you mark the job complete.
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
          If you can’t take this job, don’t accept it — speak to your manager and
          they’ll reassign it.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Not now
          </Button>
          {/* Names the action it performs, rather than a bare "I agree". */}
          <Button onClick={onAccept}>
            {jobLabel ? 'Accept job & start sharing' : 'Accept & start sharing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
