import * as React from "react";
import { Link, Redirect } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ClipboardList, MapPin, MessageSquareText, Phone, RotateCcw, X } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/sheet";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { formatShortDate, tensionLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Stars } from "@/features/market/bits";
import { ACTIVE_STATUSES, bookingQuery, cents, type BookingStatus, type PlayerBooking } from "@/features/market/types";

const STEPS: Array<{ status: BookingStatus; label: string }> = [
  { status: "requested", label: "Requested" },
  { status: "accepted", label: "Confirmed" },
  { status: "in_progress", label: "On the machine" },
  { status: "ready", label: "Ready for pickup" },
  { status: "collected", label: "Collected" },
];

const STATUS_BADGE: Record<BookingStatus, { label: string; tone: "neutral" | "brand" | "grass" | "clay" | "hard" | "ball" }> = {
  requested: { label: "Waiting for the shop", tone: "hard" },
  accepted: { label: "Confirmed", tone: "hard" },
  in_progress: { label: "On the machine", tone: "clay" },
  ready: { label: "Ready for pickup", tone: "ball" },
  collected: { label: "Collected", tone: "grass" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  declined: { label: "Declined by shop", tone: "brand" },
};

const when = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (d: string | null | undefined) => (d ? when.format(new Date(d)) : "");
const lastAt = (b: PlayerBooking, status: BookingStatus) => [...b.statusLog].reverse().find((l) => l.status === status)?.at;

export default function Bookings() {
  const { signedIn, loading } = useMe();
  const q = useQuery<PlayerBooking[]>({
    queryKey: ["/api/bookings"],
    enabled: signedIn,
    // Live while anything is still in the shop.
    refetchInterval: (query) => ((query.state.data ?? []).some((b) => ACTIVE_STATUSES.includes(b.status)) ? 30_000 : false),
    refetchIntervalInBackground: false,
  });

  if (!loading && !signedIn) return <Redirect to="/login?next=/bookings" />;

  const list = q.data ?? [];
  const active = list.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const past = list.filter((b) => !ACTIVE_STATUSES.includes(b.status));

  return (
    <Page narrow>
      <PageHeader
        eyebrow="Restrings"
        title={
          <>
            Your <em className="text-brand">restrings</em>
          </>
        }
        description="Every racket you've booked in through 10IS, live from the shop."
        action={
          list.length > 0 ? (
            <Button asChild variant="secondary">
              <Link href="/shops">Book another</Link>
            </Button>
          ) : undefined
        }
      />

      {q.isLoading || loading ? (
        <div className="space-y-3">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : q.isError ? (
        <EmptyState title="Couldn't load your restrings" body={(q.error as Error).message} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No restrings yet"
          body="Book a 10IS stringer and follow your racket from drop-off to pickup — no phone tag."
          action={
            <Button asChild size="lg">
              <Link href="/shops">Find a 10IS stringer</Link>
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <section aria-label="In progress" className="space-y-4">
              {active.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section aria-labelledby="past" className={cn(active.length > 0 && "mt-10")}>
              <h2 id="past" className="eyebrow mb-3">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Page>
  );
}

function useBookingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: number; action: "cancel" | "rate"; body?: unknown }) => api<PlayerBooking>("POST", `/api/bookings/${id}/${action}`, body),
    onSuccess: (b) => qc.setQueryData<PlayerBooking[]>(["/api/bookings"], (old) => old?.map((x) => (x.id === b.id ? { ...x, ...b } : x))),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong."),
  });
}

function BookingCard({ booking: b }: { booking: PlayerBooking }) {
  const action = useBookingAction();
  const [confirm, setConfirm] = React.useState(false);
  const live = ACTIVE_STATUSES.includes(b.status);
  const stopped = b.status === "cancelled" || b.status === "declined";
  const badge = STATUS_BADGE[b.status];
  const canCancel = b.status === "requested" || b.status === "accepted";
  const canRate = b.status === "ready" || b.status === "collected";
  const setup = [b.crosses && b.mains !== b.crosses ? `${b.mains} / ${b.crosses}` : b.mains, b.gauge].filter(Boolean).join(" · ");
  const again = `/shops/${b.shop.slug}?${bookingQuery({
    savedRacketId: b.savedRacketId,
    racketLabel: b.savedRacketId ? null : b.racketLabel,
    stringId: b.sampleProgramId ? null : b.stringId,
    mains: b.stringId && !b.sampleProgramId ? null : b.mains,
    crosses: b.crosses,
    gauge: b.gauge,
    tensionMains: b.tensionMains,
    tensionCrosses: b.tensionCrosses,
  })}`;

  async function rate(n: number) {
    await action.mutateAsync({ id: b.id, action: "rate", body: { rating: n } });
    toast.success("Thanks — your rating helps other players.");
  }

  return (
    <Card className={cn("overflow-hidden", live ? "rounded-3xl" : "")}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <h3 className="display mt-3 truncate text-2xl leading-tight">{b.racketLabel}</h3>
            <p className="mt-0.5 text-sm text-muted">
              <Link href={`/shops/${b.shop.slug}`} className="font-medium text-ink hover:underline">
                {b.shop.name}
              </Link>
              {b.shop.city ? ` · ${b.shop.city}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xl font-semibold tabular">{b.sampleProgramId ? "Free" : cents(b.priceCents)}</p>
            {b.rush && <p className="text-2xs font-semibold uppercase text-clay">Rush</p>}
            {b.sampleProgramId && <p className="text-2xs text-muted">Brand sample</p>}
          </div>
        </div>

        {(setup || b.tensionMains != null) && (
          <p className="mt-3 text-sm">
            {setup || "String at drop-off"}
            {b.tensionMains != null && <span className="ml-2 font-mono font-semibold tabular">{tensionLabel(b.tensionMains, b.tensionCrosses)}</span>}
          </p>
        )}

        {live && (
          <p className="mt-3 text-sm text-muted">
            {b.status === "ready" ? `Ready since ${fmt(lastAt(b, "ready") ?? b.dueAt)}` : `Due ${fmt(b.dueAt)}`}
            {b.status === "requested" && ` · drop off ${formatShortDate(b.dropOffAt)}`}
          </p>
        )}

        {!stopped && <Timeline booking={b} />}
        {stopped && b.statusLog.at(-1)?.note && <p className="mt-3 text-sm text-muted">{b.statusLog.at(-1)!.note}</p>}

        {b.shopNotes && (
          <div className="mt-5 flex gap-3 rounded-2xl bg-surface-2/70 p-4">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <p className="text-xs font-semibold text-muted">Note from your stringer</p>
              <p className="mt-1 whitespace-pre-line text-[0.9375rem] leading-relaxed">{b.shopNotes}</p>
            </div>
          </div>
        )}

        {canRate && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2/40 px-4 py-2">
            <span className="text-sm font-medium">{b.rating ? "Your rating" : "How's it playing?"}</span>
            <Stars value={b.rating} onChange={rate} disabled={action.isPending} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3 sm:px-6">
        {b.shop.phone && live && (
          <Button asChild variant="secondary" size="sm">
            <a href={`tel:${b.shop.phone.replace(/\s+/g, "")}`}>
              <Phone /> Call shop
            </a>
          </Button>
        )}
        {b.shop.address && live && (
          <Button asChild variant="ghost" size="sm">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.shop.name} ${b.shop.address}`)}`} target="_blank" rel="noopener noreferrer">
              <MapPin /> Directions
            </a>
          </Button>
        )}
        {!live && (
          <Button asChild variant="secondary" size="sm">
            <Link href={again}>
              <RotateCcw /> Book again
            </Link>
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" size="sm" className="ml-auto text-brand" onClick={() => setConfirm(true)}>
            <X /> Cancel
          </Button>
        )}
      </div>

      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title="Cancel this restring?"
        body={`${b.shop.name} will see it's cancelled. You can book again any time.`}
        confirmLabel="Cancel booking"
        loading={action.isPending}
        onConfirm={async () => {
          await action.mutateAsync({ id: b.id, action: "cancel" }).catch(() => undefined);
          setConfirm(false);
        }}
      />
    </Card>
  );
}

function Timeline({ booking: b }: { booking: PlayerBooking }) {
  const current = STEPS.findIndex((s) => s.status === b.status);
  return (
    <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i <= current;
        const now = i === current;
        const t = lastAt(b, s.status);
        return (
          <li key={s.status} className="relative flex flex-col items-center text-center" aria-current={now ? "step" : undefined}>
            {i > 0 && <span aria-hidden className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-grass" : "bg-line")} />}
            <span
              className={cn(
                "relative grid size-7 place-items-center rounded-full text-xs font-bold transition-colors",
                done ? "bg-grass text-white" : "bg-surface-2 text-faint ring-1 ring-line",
                now && b.status !== "collected" && "ring-4 ring-grass/20",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-[0.6875rem] font-medium leading-tight", done ? "text-ink" : "text-faint")}>{s.label}</span>
            {t && done && <span className="mt-0.5 hidden text-2xs text-muted sm:block">{fmt(t)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
