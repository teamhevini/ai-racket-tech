import * as React from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  History,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton, Stat } from "@/components/ui/surface";
import { ConfirmSheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/field";
import { FreshnessRing, statusText, statusTone } from "@/components/FreshnessRing";
import { UpgradeCard } from "@/components/UpgradeCard";
import { JobForm } from "@/features/JobForm";
import { RacketForm } from "@/features/RacketForm";
import { useDeleteJob, useDeleteRacket, useRacket, useSaveRacket } from "@/hooks/use-bag";
import { useMe } from "@/hooks/use-me";
import { formatDate, money, racketName, setupLabel, tensionLabel } from "@/lib/format";
import type { RacketDetail as Detail } from "@/lib/types";
import { cn } from "@/lib/utils";

type HistoryEntry = Detail["history"][number];

export default function RacketDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { signedIn, loading } = useMe();
  const q = useRacket(id);
  const saveRacket = useSaveRacket();
  const deleteRacket = useDeleteRacket();
  const deleteJob = useDeleteJob();

  const [logging, setLogging] = React.useState(false);
  const [editingJob, setEditingJob] = React.useState<HistoryEntry | null>(null);
  const [editingRacket, setEditingRacket] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [jobToDelete, setJobToDelete] = React.useState<HistoryEntry | null>(null);
  const [menu, setMenu] = React.useState(false);

  if (!loading && !signedIn) return <Redirect to={`/login?next=/bag/${params.id}`} />;

  if (q.isLoading || loading) {
    return (
      <Page narrow>
        <Skeleton className="mb-6 h-6 w-24" />
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="mt-6 h-40 rounded-2xl" />
      </Page>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState
          title="Racket not found"
          body="It may have been removed from your bag."
          action={
            <Button asChild variant="secondary">
              <Link href="/bag">Back to my bag</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const { racket, history, hiddenJobs, totalJobs, stats, recommendations } = q.data;
  const r = racket.reminder;
  const latest = racket.latestJob;

  async function toggleReminders(v: boolean) {
    try {
      await saveRacket.mutateAsync({ id: racket.id, data: { reminderEnabled: v } });
      toast.success(v ? "Reminders on" : "Reminders paused");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Page narrow>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/bag">
            <ArrowLeft /> My bag
          </Link>
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon-sm" aria-label="Racket options" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal />
          </Button>
          {menu && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" aria-hidden tabIndex={-1} onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl bg-surface p-1 shadow-lift ring-1 ring-line animate-in fade-in-0 zoom-in-95">
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2"
                  onClick={() => {
                    setMenu(false);
                    setEditingRacket(true);
                  }}
                >
                  <Pencil className="size-4" /> Edit racket
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-brand hover:bg-brand-soft"
                  onClick={() => {
                    setMenu(false);
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="size-4" /> Remove from bag
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-surface p-6 shadow-card ring-1 ring-line/70 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[18px] border-line/50" />
        <div className="relative flex items-center gap-5">
          <FreshnessRing reminder={r} size={104} stroke={9} />
          <div className="min-w-0">
            <h1 className="display truncate text-4xl leading-none sm:text-5xl">{racket.nickname}</h1>
            {racketName(racket) && <p className="mt-1.5 truncate text-sm text-muted">{racketName(racket)}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {racket.reminderEnabled ? <Badge tone={statusTone(r.status)}>{statusText(r)}</Badge> : <Badge>Reminders paused</Badge>}
              {r.dueAt && <Badge>Next: {formatDate(r.dueAt)}</Badge>}
            </div>
          </div>
        </div>

        {latest && (
          <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
            <Stat label="Strings" value={setupLabel(latest.mains, latest.crosses) ?? "—"} />
            <Stat label="Tension" value={tensionLabel(latest.tensionMains, latest.tensionCrosses) ?? "—"} />
            <Stat label="Strung" value={formatDate(latest.strungAt)} />
          </div>
        )}

        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:flex">
          <Button size="lg" className="col-span-2 sm:flex-1" onClick={() => setLogging(true)}>
            <Plus /> Log a restring
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/setup?racket=${racket.id}`}>
              <Sparkles /> New setup
            </Link>
          </Button>
          {r.dueAt ? (
            <Button asChild variant="secondary" size="lg">
              <a href={`/api/bag/rackets/${racket.id}/reminder.ics`} download>
                <CalendarPlus /> Add to calendar
              </a>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="lg">
              <Link href="/stringers">
                <MapPin /> Stringers
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Reminder settings */}
      <Card className="mt-4 p-5">
        <Switch
          checked={racket.reminderEnabled}
          onCheckedChange={toggleReminders}
          disabled={saveRacket.isPending}
          label="Restring reminders"
          description={
            <>
              Every <strong className="text-ink">{r.intervalDays} days</strong>
              {racket.restringIntervalDays
                ? " (your schedule)"
                : ` — based on ${racket.hoursPerWeek ?? 3} h/week${r.material === "poly" ? " and polyester, which loses tension fastest" : r.material === "soft" ? " and a softer string" : ""}`}
              .{" "}
              <button className="underline underline-offset-2" onClick={() => setEditingRacket(true)}>
                Adjust
              </button>
            </>
          }
        />
      </Card>

      {/* Stats */}
      {stats && stats.restrings > 1 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="p-4">
            <Stat label="Restrings" value={stats.restrings} hint={`since ${formatDate(stats.firstStrungAt)}`} />
          </Card>
          <Card className="p-4">
            <Stat label="Avg. gap" value={stats.averageDaysBetween ? `${stats.averageDaysBetween}d` : "—"} />
          </Card>
          <Card className="p-4">
            <Stat label={stats.totalSpent ? "Spent" : "Avg. tension"} value={stats.totalSpent ? money(stats.totalSpent) : stats.averageTension ? `${stats.averageTension}` : "—"} />
          </Card>
        </div>
      )}

      {/* History */}
      <section className="mt-10" aria-labelledby="history-title">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1">Racket history</p>
            <h2 id="history-title" className="display text-3xl">
              Every restring
            </h2>
          </div>
          {totalJobs > 0 && <span className="text-sm text-muted">{totalJobs} total</span>}
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={<History />}
            title="No restrings yet"
            body="Log the last time this racket was strung — even roughly — and we'll start counting down to the next one."
            action={
              <Button onClick={() => setLogging(true)}>
                <Plus /> Log a restring
              </Button>
            }
          />
        ) : (
          <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[0.9rem] before:top-4 before:w-px before:bg-line">
            {history.map((j, i) => (
              <li key={j.id} className="relative pl-10 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-1.5 top-5 size-[0.85rem] rounded-full ring-4 ring-bg",
                    i === 0 ? "bg-ball shadow-[inset_-2px_-2px_0_rgb(0_0_0/0.15)]" : "bg-line",
                  )}
                />
                <HistoryCard entry={j} onEdit={() => setEditingJob(j)} onDelete={() => setJobToDelete(j)} />
              </li>
            ))}
          </ol>
        )}

        {hiddenJobs > 0 && (
          <UpgradeCard
            className="mt-4"
            title={`${hiddenJobs} older restring${hiddenJobs > 1 ? "s" : ""} hidden`}
            body="Pro and Club members see the complete history of every racket."
          />
        )}
      </section>

      {recommendations.length > 0 && (
        <section className="mt-10">
          <p className="eyebrow mb-1">AI setups</p>
          <h2 className="display mb-4 text-3xl">Recommended for this racket</h2>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/recommendation/${rec.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70 transition hover:shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {rec.output.setup.mains.exampleStrings[0] ?? rec.output.setup.mains.stringFamily}
                  </p>
                  <p className="text-sm text-muted">
                    <span className="font-mono tabular">{rec.output.setup.mains.tension} lbs</span> · {formatDate(rec.createdAt)}
                  </p>
                </div>
                <Badge tone={rec.confidence === "high" ? "grass" : rec.confidence === "medium" ? "clay" : "neutral"}>{rec.confidence}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      <JobForm open={logging} onOpenChange={setLogging} racket={racket} />
      <JobForm open={!!editingJob} onOpenChange={(v) => !v && setEditingJob(null)} racket={racket} job={editingJob} />
      <RacketForm open={editingRacket} onOpenChange={setEditingRacket} racket={racket} />
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Remove ${racket.nickname}?`}
        body={`This deletes the racket and all ${totalJobs} restring${totalJobs === 1 ? "" : "s"} in its history. This can't be undone.`}
        confirmLabel="Remove racket"
        loading={deleteRacket.isPending}
        onConfirm={async () => {
          await deleteRacket.mutateAsync(racket.id);
          toast.success(`${racket.nickname} removed`);
          navigate("/bag");
        }}
      />
      <ConfirmSheet
        open={!!jobToDelete}
        onOpenChange={(v) => !v && setJobToDelete(null)}
        title="Delete this restring?"
        body={jobToDelete ? `The ${formatDate(jobToDelete.strungAt)} entry will be removed from this racket's history.` : ""}
        confirmLabel="Delete entry"
        loading={deleteJob.isPending}
        onConfirm={async () => {
          if (jobToDelete) await deleteJob.mutateAsync(jobToDelete.id);
          setJobToDelete(null);
          toast.success("Entry deleted");
        }}
      />
    </Page>
  );
}

function HistoryCard({ entry, onEdit, onDelete }: { entry: HistoryEntry; onEdit: () => void; onDelete: () => void }) {
  const setup = setupLabel(entry.mains, entry.crosses);
  const tension = tensionLabel(entry.tensionMains, entry.tensionCrosses);
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{formatDate(entry.strungAt)}</p>
          <p className="mt-0.5 truncate text-[0.9375rem]">{setup ?? <span className="text-muted">Strings not recorded</span>}</p>
        </div>
        <div className="flex shrink-0 -mr-2 -mt-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${formatDate(entry.strungAt)} restring`}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${formatDate(entry.strungAt)} restring`}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {tension && <Badge tone="hard" className="font-mono">{tension}</Badge>}
        {entry.gauge && <Badge>{entry.gauge} ga</Badge>}
        {entry.stringer && (
          <Badge tone="grass">
            <MapPin className="size-3" /> {entry.stringer.stringerName}
          </Badge>
        )}
        {entry.price != null && <Badge>{money(entry.price)}</Badge>}
        {entry.rating != null && (
          <Badge tone="ball">
            <Star className="size-3 fill-current" /> {entry.rating}/5
          </Badge>
        )}
        {entry.recommendationRunId && (
          <Link href={`/recommendation/${entry.recommendationRunId}`}>
            <Badge tone="brand">
              <Sparkles className="size-3" /> AI setup
            </Badge>
          </Link>
        )}
      </div>
      {entry.notes && <p className="mt-3 text-sm leading-relaxed text-muted">{entry.notes}</p>}
    </div>
  );
}
