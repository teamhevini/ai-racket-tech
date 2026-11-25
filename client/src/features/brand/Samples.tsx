import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Gift, Lock, Pause, Play, Plus, Sparkles, Square } from "lucide-react";
import { BRAND_PLANS, SAMPLE_PLATFORM_FEE_PCT } from "@shared/tiers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useBrandCheckout } from "./Plan";
import { dollars, errMsg, int, Kv, Note, pct, StatusPill, toCents, type BrandString, type ProgramsResponse } from "./shared";

const programsKey = ["/api/brand/programs"] as const;

export function SamplesTab({ strings }: { strings: BrandString[] }) {
  const q = useQuery<ProgramsResponse>({ queryKey: programsKey });
  const [open, setOpen] = React.useState(false);

  if (q.isLoading) return <Skeleton className="h-72 rounded-2xl" />;
  if (q.isError || !q.data) return <EmptyState title="Couldn't load programmes" body={errMsg(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} />;
  if (!q.data.unlocked) return <SamplesLocked />;

  const { programs, shops } = q.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="display text-4xl leading-tight">Samples</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Put your string in players' rackets through partner stringers. You pay an install fee per racket strung, and we track who buys it again.
          </p>
        </div>
        {programs.length > 0 && strings.length > 0 && (
          <Button onClick={() => setOpen(true)}>
            <Plus /> New programme
          </Button>
        )}
      </div>

      {programs.length === 0 ? (
        <EmptyState
          icon={<Gift />}
          title="No programmes yet"
          body={strings.length ? `${int(shops.length)} Shop Pro partner stringers can install your samples.` : "Add a string to your catalogue first."}
          action={
            strings.length ? (
              <Button size="lg" onClick={() => setOpen(true)}>
                <Plus /> New programme
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {programs.map((p) => (
            <ProgramCard key={p.id} p={p} model={strings.find((s) => s.id === p.stringId)?.model ?? "String"} />
          ))}
        </div>
      )}

      <ProgramSheet open={open} onOpenChange={setOpen} strings={strings} shops={shops} />
    </div>
  );
}

function SamplesLocked() {
  const checkout = useBrandCheckout();
  const plan = BRAND_PLANS.partner;
  return (
    <Card className="relative overflow-hidden bg-ink p-6 text-bg sm:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-ball/20 blur-3xl" />
      <div className="relative max-w-xl">
        <span className="grid size-11 place-items-center rounded-full bg-ball text-ball-ink">
          <Lock className="size-5" />
        </span>
        <h2 className="display mt-5 text-4xl leading-tight">Sample programmes come with Partner</h2>
        <p className="mt-2 text-sm leading-relaxed text-bg/70">
          Fund installs at partner stringers, then see who rated it and who came back to buy it at full price.
        </p>
        <ul className="mt-5 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-ball" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Button variant="ball" size="lg" loading={checkout.isPending} onClick={() => checkout.mutate("partner")}>
            <Sparkles /> Upgrade to Partner
          </Button>
          <p className="text-sm text-bg/70">
            <span className="font-semibold text-bg tabular">{plan.price}</span> {plan.cadence}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProgramCard({ p, model }: { p: ProgramsResponse["programs"][number]; model: string }) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: (status: "active" | "paused" | "ended") => api("PATCH", `/api/brand/programs/${p.id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: programsKey }),
    onError: (e) => toast.error(errMsg(e)),
  });
  const st = p.stats;
  const claimed = st?.claimed ?? 0;
  const fill = p.unitsTotal ? Math.min(100, (claimed / p.unitsTotal) * 100) : 0;
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="display text-2xl leading-tight">{p.title}</h3>
            <StatusPill status={p.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {model} · {dollars(p.installFeeCents)} per install · {int(p.shops)} {p.shops === 1 ? "shop" : "shops"}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Claimed</span>
          <span className="font-mono tabular">
            {int(claimed)} of {int(p.unitsTotal)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-grass" style={{ width: `${fill}%` }} />
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-4 gap-3">
        <Stat label="Installed" value={int(st?.installed ?? 0)} />
        <Stat label="Rating" value={<Kv value={st?.avgRating ?? null} format={(n) => n.toFixed(1)} />} />
        <Stat label="Rebuy" value={<Kv value={st?.rebuyRate ?? null} format={(n) => pct(n)} />} />
        <Stat label="Spend" value={dollars(st?.spendCents ?? 0)} />
      </dl>
      {p.status !== "ended" && (
        <div className="mt-5 flex gap-2 border-t border-line pt-4">
          <Button size="sm" variant="outline" loading={setStatus.isPending && setStatus.variables !== "ended"} onClick={() => setStatus.mutate(p.status === "active" ? "paused" : "active")}>
            {p.status === "active" ? <Pause /> : <Play />} {p.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" loading={setStatus.isPending && setStatus.variables === "ended"} onClick={() => setStatus.mutate("ended")}>
            <Square /> End
          </Button>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm font-semibold tabular">{value}</dd>
    </div>
  );
}

function ProgramSheet({
  open,
  onOpenChange,
  strings,
  shops,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  strings: BrandString[];
  shops: ProgramsResponse["shops"];
}) {
  const qc = useQueryClient();
  const blank = () => ({ stringId: strings[0]?.id ?? 0, title: "", pitch: "", units: "50", fee: "15.00", shopIds: shops.map((s) => s.id) });
  const [f, setF] = React.useState(blank);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setF(blank());
      setErr(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const feeCents = toCents(f.fee);
  const units = parseInt(f.units, 10);
  const stringerGets = Number.isNaN(feeCents) ? null : Math.round(feeCents * (1 - SAMPLE_PLATFORM_FEE_PCT / 100));
  const maxSpend = Number.isNaN(feeCents) || Number.isNaN(units) ? null : feeCents * units;

  const save = useMutation({
    mutationFn: () => {
      if (Number.isNaN(feeCents) || feeCents < 500 || feeCents > 5000) throw new ApiError("Install fee must be between $5.00 and $50.00.", 400);
      if (Number.isNaN(units) || units < 10) throw new ApiError("Offer at least 10 units.", 400);
      return api("POST", "/api/brand/programs", { stringId: f.stringId, title: f.title, pitch: f.pitch || null, unitsTotal: units, installFeeCents: feeCents, shopIds: f.shopIds });
    },
    onSuccess: () => {
      toast.success("Programme live at partner stringers");
      qc.invalidateQueries({ queryKey: programsKey });
      onOpenChange(false);
    },
    onError: (e) => setErr(errMsg(e)),
  });

  const allOn = f.shopIds.length === shops.length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="New sample programme"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{maxSpend != null && <>Up to {dollars(maxSpend)} if every unit is installed</>}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.stringId || f.title.trim().length < 4 || !f.shopIds.length}>
              Launch programme
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="String">
          <Select value={f.stringId} onChange={(e) => setF({ ...f, stringId: Number(e.target.value) })}>
            {strings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.model}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" hint="Players see this at the stringer.">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Try it free on your next restring" maxLength={80} />
        </Field>
        <Field label="Pitch" optional>
          <Textarea rows={2} value={f.pitch} onChange={(e) => setF({ ...f, pitch: e.target.value })} maxLength={400} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Units" hint="10 minimum">
            <Input inputMode="numeric" value={f.units} onChange={(e) => setF({ ...f, units: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Install fee" hint={stringerGets != null ? `Stringer receives ${dollars(stringerGets)}` : "$5.00 to $50.00"}>
            <Input inputMode="decimal" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} />
          </Field>
        </div>
        <Note>The install fee is paid to the stringer for each racket strung with your sample. 10IS keeps {SAMPLE_PLATFORM_FEE_PCT}%.</Note>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Partner shops</p>
            {shops.length > 0 && (
              <button type="button" className="text-xs font-medium text-muted underline-offset-2 hover:underline" onClick={() => setF({ ...f, shopIds: allOn ? [] : shops.map((s) => s.id) })}>
                {allOn ? "Clear all" : "Select all"}
              </button>
            )}
          </div>
          {shops.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No Shop Pro partners yet. We'll let you know when stringers join.</p>
          ) : (
            <ul className="mt-3 max-h-56 divide-y divide-line overflow-y-auto rounded-2xl ring-1 ring-line">
              {shops.map((s) => {
                const on = f.shopIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setF({ ...f, shopIds: on ? f.shopIds.filter((x) => x !== s.id) : [...f.shopIds, s.id] })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60"
                    >
                      <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-ink bg-ink text-bg" : "border-line")}>
                        {on && <Check className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      {s.city && <span className="shrink-0 text-xs text-muted">{s.city}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {err && (
          <p className="text-sm text-brand" role="alert">
            {err}
          </p>
        )}
      </form>
    </Sheet>
  );
}
