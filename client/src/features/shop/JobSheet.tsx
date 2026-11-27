import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gauge, History, Lock, Mail, MonitorPlay, Phone, ShieldOff, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea, UnitInput } from "@/components/ui/field";
import { ConfirmSheet, Sheet } from "@/components/ui/sheet";
import { Badge, Skeleton } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShopUpgrade } from "./ShopUpgrade";
import type { Booking, JobDetail } from "./types";
import { PRIMARY_NEXT, STATUS_LABEL, cents, dueLabel, errMsg, formatDateTime, invalidateShop, stringText, tensionText, useSetStatus } from "./util";

export function JobSheet({ id, onClose, onMachine }: { id: number | null; onClose: () => void; onMachine: (id: number) => void }) {
  const open = id != null;
  const q = useQuery<JobDetail>({ queryKey: [`/api/shop/bookings/${id}`], enabled: open });
  const d = q.data;
  const b = d?.booking;
  const setStatus = useSetStatus();
  const [confirm, setConfirm] = React.useState<null | "declined" | "cancelled">(null);

  const primary = b ? PRIMARY_NEXT[b.status] : undefined;
  const canMachine = b && (b.status === "accepted" || b.status === "in_progress");

  const move = (status: Booking["status"]) => b && setStatus.mutate({ id: b.id, status, name: b.customerName, app: !!b.playerUserId }, { onSuccess: () => status !== "in_progress" && onClose() });

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={b ? b.customerName : "Job"}
        description={b ? `${b.racketLabel} · ${STATUS_LABEL[b.status]}` : undefined}
        footer={
          b && (primary || canMachine) ? (
            <div className="flex gap-2">
              {canMachine && (
                <Button variant="secondary" size="lg" className="shrink-0 px-5" onClick={() => onMachine(b.id)}>
                  <MonitorPlay /> Machine mode
                </Button>
              )}
              {primary && (
                <Button size="lg" className="flex-1" loading={setStatus.isPending} onClick={() => move(primary.to)}>
                  {primary.label}
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {q.isLoading || !d || !b ? (
          <div className="space-y-3">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6 pb-2">
            <TensionPanel detail={d} />

            {d.sample && (
              <div className="flex items-center gap-3 rounded-2xl bg-ball/20 p-3.5 ring-1 ring-ball/60">
                <Sparkles className="size-5 shrink-0 text-ink" />
                <p className="text-sm">
                  <span className="font-semibold">{d.sample.title}</span> sample install · you're paid <span className="font-semibold tabular">{cents(d.sample.payoutCents)}</span>
                </p>
              </div>
            )}

            {b.notes && (
              <section>
                <p className="eyebrow mb-2">From the player</p>
                <blockquote className="rounded-2xl bg-surface-2 p-4 text-[0.9375rem] leading-relaxed">“{b.notes}”</blockquote>
              </section>
            )}

            <ShopFields key={b.id} booking={b} />

            <section>
              <p className="eyebrow mb-2">Customer</p>
              <div className="flex flex-wrap gap-2">
                {b.customerPhone && (
                  <Button asChild variant="secondary" className="h-12">
                    <a href={`tel:${b.customerPhone.replace(/[^\d+]/g, "")}`}>
                      <Phone /> {b.customerPhone}
                    </a>
                  </Button>
                )}
                {b.customerEmail && (
                  <Button asChild variant="outline" className="h-12">
                    <a href={`mailto:${b.customerEmail}`}>
                      <Mail /> Email
                    </a>
                  </Button>
                )}
                {!b.customerPhone && !b.customerEmail && <p className="text-sm text-muted">No contact details on this job.</p>}
              </div>
              <p className="mt-2 text-xs text-muted">
                {b.playerUserId ? "Booked through the 10IS app — status changes reach them automatically." : "Walk-in customer."}
              </p>
            </section>

            <Timeline booking={b} />
            <HistorySection detail={d} />

            {(d.next.includes("declined") || d.next.includes("cancelled")) && (
              <div className="border-t border-line pt-4">
                <Button variant="danger" size="sm" onClick={() => setConfirm(d.next.includes("declined") ? "declined" : "cancelled")}>
                  {d.next.includes("declined") ? "Decline request" : "Cancel job"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
      <ConfirmSheet
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm === "declined" ? "Decline this request?" : "Cancel this job?"}
        body={b?.playerUserId ? "The player will be told in their app so they can book elsewhere." : "It moves out of your queue."}
        confirmLabel={confirm === "declined" ? "Decline" : "Cancel job"}
        loading={setStatus.isPending}
        onConfirm={() => {
          if (!b || !confirm) return;
          setStatus.mutate({ id: b.id, status: confirm, name: b.customerName, app: !!b.playerUserId }, { onSuccess: () => (setConfirm(null), onClose()) });
        }}
      />
    </>
  );
}

function TensionPanel({ detail }: { detail: JobDetail }) {
  const b = detail.booking;
  const t = tensionText(b.tensionMains, b.tensionCrosses);
  const due = dueLabel(b.dueAt);
  const active = ["requested", "accepted", "in_progress"].includes(b.status);
  const r = detail.racket;
  const rows: Array<[string, React.ReactNode]> = [
    ["Mains", b.mains ?? "—"],
    ["Crosses", b.crosses ?? b.mains ?? "—"],
    ["Gauge", b.gauge ?? "—"],
    ["Pattern", r?.stringPattern ?? "—"],
    ["Dropped off", formatDateTime(b.dropOffAt)],
    ["Due", formatDateTime(b.dueAt)],
  ];
  return (
    <section className="overflow-hidden rounded-3xl bg-ink text-bg">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {b.rush && (
            <Badge tone="ball">
              <Zap className="size-3" /> Rush
            </Badge>
          )}
          {active && <span className={cn("text-sm font-semibold", due.overdue ? "text-brand" : "text-bg/70")}>{due.text}</span>}
          {b.playerSuppliesString && <span className="text-sm text-bg/70">· player's own string</span>}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-mono text-7xl font-bold leading-none tabular">{t ?? "—"}</span>
          {t && <span className="mb-1.5 text-lg text-bg/60">lbs</span>}
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug">{stringText({ ...b, string: detail.string })}</p>
        {r && (r.brand || r.model) && (
          <p className="text-sm text-bg/60">
            {[r.brand, r.model].filter(Boolean).join(" ")}
            {r.headSize ? ` · ${r.headSize} sq in` : ""}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px bg-bg/10 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-ink px-5 py-3">
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-bg/50">{k}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ShopFields({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const [notes, setNotes] = React.useState(booking.shopNotes ?? "");
  const [price, setPrice] = React.useState(booking.priceCents != null ? (booking.priceCents / 100).toFixed(2) : "");
  const dirty = notes !== (booking.shopNotes ?? "") || price !== (booking.priceCents != null ? (booking.priceCents / 100).toFixed(2) : "");
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { shopNotes: notes.trim() || null };
      const p = parseFloat(price);
      if (price.trim() && Number.isFinite(p)) body.priceCents = Math.round(p * 100);
      return api("PATCH", `/api/shop/bookings/${booking.id}`, body);
    },
    onSuccess: () => {
      toast.success("Job updated");
      invalidateShop(qc);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <section className="space-y-4">
      <Field label="Shop notes" hint="Kept with this racket for next time. App customers see them once the racket is ready.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Frame crack at 10 o'clock — told the player" maxLength={600} />
      </Field>
      <div className="flex items-end gap-3">
        <Field label="Price" className="flex-1">
          <UnitInput unit="USD" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" />
        </Field>
        <Button variant="ink" className="h-12" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </section>
  );
}

function Timeline({ booking }: { booking: Booking }) {
  const log = [...booking.statusLog].reverse();
  if (!log.length) return null;
  return (
    <section>
      <p className="eyebrow mb-3">Timeline</p>
      <ol className="relative space-y-4 border-l border-line pl-5">
        {log.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative">
            <span className={cn("absolute -left-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-surface", i === 0 ? "bg-grass" : "bg-line")} />
            <p className="text-sm font-medium">{STATUS_LABEL[e.status]}</p>
            <p className="text-xs text-muted">
              {formatDateTime(e.at)}
              {e.note ? ` · ${e.note}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HistorySection({ detail }: { detail: JobDetail }) {
  const { atThisShop, fullHistory, historyState } = detail;
  return (
    <section className="space-y-4">
      <p className="eyebrow flex items-center gap-1.5">
        <History className="size-3.5" /> History
      </p>

      <div>
        <p className="mb-2 text-sm font-medium">At your shop</p>
        {atThisShop.length === 0 ? (
          <p className="text-sm text-muted">First time this racket's been on your machine.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
            {atThisShop.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{stringText(h)}</p>
                  <p className="truncate text-xs text-muted">
                    {formatShortDate(h.dropOffAt)}
                    {h.shopNotes ? ` · ${h.shopNotes}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular">{tensionText(h.tensionMains, h.tensionCrosses) ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {historyState === "shared" && fullHistory && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Gauge className="size-4 text-grass" /> Full racket history <span className="font-normal text-muted">· shared by the player</span>
          </p>
          {fullHistory.length === 0 ? (
            <p className="text-sm text-muted">No earlier restrings logged.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
              {fullHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{[h.mains, h.crosses && h.crosses !== h.mains ? h.crosses : null].filter(Boolean).join(" / ") || "Unknown string"}</p>
                    <p className="truncate text-xs text-muted">
                      {formatShortDate(h.strungAt)} · {h.stringerName ?? "Unknown stringer"}
                      {h.rating ? ` · rated ${h.rating}/5` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular">{tensionText(h.tensionMains, h.tensionCrosses) ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {historyState === "locked" && (
        <ShopUpgrade compact title="See every restring on this racket" body="The player shared their full history. Shop Pro shows it — strings, tensions and ratings from every stringer." />
      )}
      {historyState === "not-shared" && (
        <p className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          <ShieldOff className="size-4 shrink-0" /> The player kept their history private.
        </p>
      )}
      {historyState === "none" && !atThisShop.length && (
        <p className="flex items-center gap-2 text-xs text-faint">
          <Lock className="size-3.5" /> Full history appears here when an app player shares it.
        </p>
      )}
    </section>
  );
}
