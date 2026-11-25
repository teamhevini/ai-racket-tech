import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ClipboardList, Inbox, Plus, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/sheet";
import { Badge, EmptyState, Segmented, Skeleton } from "@/components/ui/surface";
import { SAMPLE_PLATFORM_FEE_PCT } from "@shared/tiers";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { JobSheet } from "./JobSheet";
import { MachineMode } from "./MachineMode";
import { WalkInSheet } from "./WalkInSheet";
import type { BookingStatus, QueueItem } from "./types";
import { PRIMARY_NEXT, STATUS_LABEL, cents, dueLabel, stringText, tensionText, useSetStatus } from "./util";

type Column = { key: string; title: string; statuses: BookingStatus[]; empty: string };
const COLUMNS: Column[] = [
  { key: "requests", title: "New requests", statuses: ["requested"], empty: "No new requests." },
  { key: "todo", title: "To string", statuses: ["accepted"], empty: "Nothing waiting." },
  { key: "machine", title: "On the machine", statuses: ["in_progress"], empty: "Machine's free." },
  { key: "ready", title: "Ready for pickup", statuses: ["ready"], empty: "Nothing waiting for pickup." },
];

const byDue = (a: QueueItem, b: QueueItem) => Number(b.rush) - Number(a.rush) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();

/** Re-render every minute so "due in 3h" stays honest. */
function useNow() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Queue() {
  const [view, setView] = React.useState<"active" | "done">("active");
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [machineId, setMachineId] = React.useState<number | null>(null);
  const [walkIn, setWalkIn] = React.useState(false);
  const active = useQuery<QueueItem[]>({ queryKey: ["/api/shop/queue?view=active"], refetchInterval: 60_000 });
  const done = useQuery<QueueItem[]>({ queryKey: ["/api/shop/queue?view=done"], enabled: view === "done" });
  const now = useNow();

  const jobs = active.data ?? [];
  const groups = COLUMNS.map((c) => ({ ...c, items: jobs.filter((j) => c.statuses.includes(j.status)).sort(byDue) }));
  const dueToday = jobs.filter((j) => (j.status === "accepted" || j.status === "in_progress") && new Date(j.dueAt).getTime() < now + 86_400_000).length;

  const closeMachine = React.useCallback(() => setMachineId(null), []);
  const openMachine = (id: number) => {
    setOpenId(null);
    setMachineId(id);
  };

  return (
    <div className="pb-28 md:pb-0">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <SummaryTile label="New" value={groups[0].items.length} tone={groups[0].items.length ? "brand" : undefined} />
        <SummaryTile label="Stringing" value={groups[2].items.length} />
        <SummaryTile label="Ready" value={groups[3].items.length} tone={groups[3].items.length ? "grass" : undefined} />
        <SummaryTile label="Due today" value={dueToday} tone={dueToday ? "clay" : undefined} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Segmented
          label="Queue view"
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: `Active${jobs.length ? ` · ${jobs.length}` : ""}` },
            { value: "done", label: "Done" },
          ]}
        />
        <Button variant="ink" className="hidden md:inline-flex" onClick={() => setWalkIn(true)}>
          <Plus /> Walk-in
        </Button>
      </div>

      <div className="mt-6">
        {view === "active" ? (
          active.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : active.isError ? (
            <EmptyState title="Couldn't load the queue" body={(active.error as Error).message} action={<Button onClick={() => active.refetch()}>Try again</Button>} />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="The queue is clear"
              body="New bookings from the 10IS app land here. Got a racket on the counter? Add it as a walk-in."
              action={
                <Button size="lg" onClick={() => setWalkIn(true)}>
                  <Plus /> Add a walk-in
                </Button>
              }
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-4 lg:gap-4">
              {groups.map((g) => (
                <section key={g.key} className={cn("min-w-0", g.items.length === 0 && "hidden lg:block")} aria-labelledby={`col-${g.key}`}>
                  <header className="mb-3 flex items-baseline justify-between gap-2 lg:sticky lg:top-20">
                    <h2 id={`col-${g.key}`} className="display text-2xl">
                      {g.title}
                    </h2>
                    <span className="font-mono text-sm tabular text-muted">{g.items.length}</span>
                  </header>
                  {g.items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint">{g.empty}</p>
                  ) : (
                    <ul className="space-y-3">
                      {g.items.map((j, i) => (
                        <li key={j.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                          <JobCard job={j} now={now} onOpen={() => setOpenId(j.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )
        ) : (
          <DoneList query={done} onOpen={setOpenId} />
        )}
      </div>

      {/* Thumb-reachable walk-in button on phones, sitting above the tab bar. */}
      <button
        type="button"
        onClick={() => setWalkIn(true)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-16 items-center gap-2 rounded-full bg-brand pl-5 pr-6 text-base font-semibold text-brand-ink shadow-[0_14px_30px_-12px_rgb(var(--brand))] transition active:scale-95 md:hidden"
      >
        <Plus className="size-6" /> Walk-in
      </button>

      <JobSheet id={openId} onClose={() => setOpenId(null)} onMachine={openMachine} />
      <WalkInSheet open={walkIn} onOpenChange={setWalkIn} />
      {machineId != null && <MachineMode id={machineId} onClose={closeMachine} />}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: "brand" | "grass" | "clay" }) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-3 ring-1 sm:px-4 sm:py-4",
        tone === "brand" ? "bg-brand text-brand-ink ring-brand" : tone === "grass" ? "bg-grass-soft ring-grass/20" : tone === "clay" ? "bg-clay-soft ring-clay/20" : "bg-surface ring-line",
      )}
    >
      <p className={cn("font-mono text-3xl font-bold leading-none tabular sm:text-4xl", tone === "grass" && "text-grass", tone === "clay" && "text-clay")}>{value}</p>
      <p className={cn("mt-1.5 truncate text-xs font-medium", tone === "brand" ? "text-brand-ink/85" : "text-muted")}>{label}</p>
    </div>
  );
}

function JobCard({ job, now, onOpen }: { job: QueueItem; now: number; onOpen: () => void }) {
  const setStatus = useSetStatus();
  const [declining, setDeclining] = React.useState(false);
  const next = PRIMARY_NEXT[job.status];
  const due = dueLabel(job.dueAt, now);
  const t = tensionText(job.tensionMains, job.tensionCrosses);
  const pending = setStatus.isPending;
  const go = (status: BookingStatus) => setStatus.mutate({ id: job.id, status, name: job.customerName, app: !!job.playerUserId });
  const showDue = job.status !== "ready";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-surface shadow-card ring-1 transition-shadow",
        due.overdue && showDue ? "ring-brand/50" : job.rush ? "ring-ball" : "ring-line/70",
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full p-4 text-left transition-colors active:bg-surface-2" aria-label={`Open ${job.customerName}'s job`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{job.customerName}</p>
            <p className="truncate text-sm text-muted">{job.racketLabel}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {job.rush && (
              <Badge tone="ball">
                <Zap className="size-3" /> Rush
              </Badge>
            )}
            {showDue && <span className={cn("text-sm font-semibold tabular", due.overdue ? "text-brand" : due.soon ? "text-clay" : "text-muted")}>{due.text}</span>}
          </div>
        </div>

        <div className="mt-3 flex items-end gap-1.5">
          <span className="font-mono text-5xl font-bold leading-none tracking-tight tabular text-ink">{t ?? "—"}</span>
          {t && <span className="mb-1 text-base font-medium text-muted">lbs</span>}
        </div>
        <p className="mt-2 truncate text-[0.9375rem] font-medium">{stringText(job)}</p>
        {(job.gauge || job.playerSuppliesString) && (
          <p className="truncate text-xs text-muted">{[job.gauge && `${job.gauge} gauge`, job.playerSuppliesString && "player's own string"].filter(Boolean).join(" · ")}</p>
        )}

        {(job.sample || job.source === "walk-in" || job.notes) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.sample && (
              <Badge className="bg-ball/25 text-ink">
                <Sparkles className="size-3" /> {job.sample.title} sample · paid {cents(Math.round((job.sample.fee * (100 - SAMPLE_PLATFORM_FEE_PCT)) / 100))}
              </Badge>
            )}
            {job.source === "walk-in" && <Badge>Walk-in</Badge>}
            {job.notes && <Badge tone="hard">Has notes</Badge>}
          </div>
        )}
      </button>

      {next && (
        <div className="flex gap-2 border-t border-line/70 p-3">
          {job.status === "requested" && (
            <Button variant="outline" className="h-14 px-5 text-base" disabled={pending} onClick={() => setDeclining(true)}>
              Decline
            </Button>
          )}
          <Button
            variant={job.status === "in_progress" ? "ball" : job.status === "ready" ? "ink" : "primary"}
            className="h-14 flex-1 text-base"
            loading={pending}
            onClick={() => go(next.to)}
          >
            {job.status === "in_progress" && <Check />}
            {next.label}
          </Button>
        </div>
      )}

      <ConfirmSheet
        open={declining}
        onOpenChange={setDeclining}
        title={`Decline ${job.customerName.split(" ")[0]}'s request?`}
        body="They'll be told in the app so they can book somewhere else."
        confirmLabel="Decline"
        loading={pending}
        onConfirm={() => setStatus.mutate({ id: job.id, status: "declined", name: job.customerName, app: !!job.playerUserId }, { onSuccess: () => setDeclining(false) })}
      />
    </article>
  );
}

function DoneList({ query, onOpen }: { query: { data?: QueueItem[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }; onOpen: (id: number) => void }) {
  if (query.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (query.isError) return <EmptyState title="Couldn't load finished jobs" body={(query.error as Error).message} action={<Button onClick={() => query.refetch()}>Try again</Button>} />;
  const rows = query.data ?? [];
  if (!rows.length) return <EmptyState icon={<ClipboardList />} title="Nothing finished yet" body="Collected, declined and cancelled jobs show up here." />;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line/70">
      {rows.map((j) => (
        <li key={j.id}>
          <button type="button" onClick={() => onOpen(j.id)} className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {j.customerName} <span className="font-normal text-muted">· {j.racketLabel}</span>
              </p>
              <p className="truncate text-sm text-muted">
                {stringText(j)} · {formatShortDate(j.dropOffAt)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-semibold tabular">{tensionText(j.tensionMains, j.tensionCrosses) ?? "—"}</p>
              <p className={cn("text-xs font-medium", j.status === "collected" ? "text-grass" : "text-faint")}>
                {STATUS_LABEL[j.status]}
                {j.priceCents != null && j.status === "collected" ? ` · ${cents(j.priceCents)}` : ""}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
