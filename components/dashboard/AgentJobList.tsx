'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { useDashboard } from '@/context/DashboardContext';
import { useTrackingSession } from '@/components/tracking/TrackingSessionProvider';

/**
 * The agent's job list.
 *
 * Shows ONLY jobs assigned to the signed-in agent, and every action posts just
 * `{ jobId }` — the server derives the actor from the session. The previous
 * shared component sent `assignedWorkerIds[0] ?? 'w1'`, which let an agent act
 * on anyone's job and attributed it to the wrong person.
 */
export function AgentJobList() {
  const { jobs, workerStatuses, me, refresh } = useDashboard();
  const { acceptJob, completeJob, busyJobId, error } = useTrackingSession();
  const [delayFor, setDelayFor] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [localBusy, setLocalBusy] = useState<string | null>(null);

  if (!me) return null;

  const myStatus = workerStatuses.find((w) => w.workerId === me.id);
  const clockedIn = myStatus?.punchStatus === 'clocked_in';

  const myJobs = jobs.filter(
    (j) =>
      j.status !== 'completed' &&
      j.assignments.some((a) => a.workerId === me.id)
  );

  const post = async (url: string, body: Record<string, unknown>, jobId: string) => {
    setLocalBusy(jobId);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refresh();
    } finally {
      setLocalBusy(null);
    }
  };

  const submitDelay = async (jobId: string) => {
    if (!delayReason.trim()) return;
    await post('/api/delay', { reason: delayReason.trim() }, jobId);
    setDelayFor(null);
    setDelayReason('');
  };

  return (
    <Section title="My jobs" icon={<Navigation className="h-3.5 w-3.5" />} accent="primary">
      {error && (
        <p className="mb-3 flex items-start gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {myJobs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No jobs assigned to you right now.
        </p>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => {
            const mine = job.assignments.find((a) => a.workerId === me.id);
            const accepted = Boolean(mine?.acceptedAt);
            const busy = busyJobId === job.id || localBusy === job.id;
            const arrived =
              myStatus?.currentJobId === job.id && myStatus?.jobState === 'arrived';

            return (
              <div
                key={job.id}
                className="rounded-lg border border-border p-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {job.homeownerName}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {job.address}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {format(new Date(job.scheduledTime), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {accepted && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      {arrived ? 'On site' : 'En route'}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  {!accepted ? (
                    <>
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={busy || !clockedIn}
                        onClick={() =>
                          acceptJob(job.id, `${job.homeownerName} — ${job.address}`)
                        }
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : clockedIn ? (
                          'Accept & start location sharing'
                        ) : (
                          'Clock in first'
                        )}
                      </Button>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {clockedIn
                          ? 'Location is shared until you mark this job complete.'
                          : 'Clock in above before accepting a job.'}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {!arrived && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            post(
                              '/api/jobs/arrive',
                              { jobId: job.id, location: job.address },
                              job.id
                            )
                          }
                        >
                          Arrived
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Mark this job complete? Location sharing will stop.'
                            )
                          ) {
                            void completeJob(job.id);
                          }
                        }}
                      >
                        Complete &amp; stop sharing
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          setDelayFor(delayFor === job.id ? null : job.id)
                        }
                      >
                        Report delay
                      </Button>
                    </div>
                  )}
                </div>

                {delayFor === job.id && (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      placeholder="What's holding you up?"
                      className="min-h-10 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy || !delayReason.trim()}
                        onClick={() => submitDelay(job.id)}
                      >
                        Send
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDelayFor(null);
                          setDelayReason('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
