import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Link2, Link2Off, Minus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { CatalogString } from "./types";
import { cents, errMsg, invalidateShop } from "./util";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (n: number) => Math.min(90, Math.max(20, Math.round(n * 2) / 2));
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="eyebrow text-center">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Lower ${label.toLowerCase()} tension`}
          onClick={() => onChange(clamp(value - 1))}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card ring-1 ring-line transition active:scale-95"
        >
          <Minus className="size-5" />
        </button>
        <input
          aria-label={`${label} tension in lbs`}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(90, Math.max(0, n)));
          }}
          onBlur={() => onChange(clamp(value))}
          className="w-full min-w-0 bg-transparent text-center font-mono text-4xl font-bold tabular text-ink focus:outline-none"
        />
        <button
          type="button"
          aria-label={`Raise ${label.toLowerCase()} tension`}
          onClick={() => onChange(clamp(value + 1))}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card ring-1 ring-line transition active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-muted">lbs</p>
    </div>
  );
}

function StringPicker({ value, onChange }: { value: CatalogString | null; onChange: (s: CatalogString | null) => void }) {
  const [q, setQ] = React.useState("");
  const dq = useDebounce(q.trim(), 250);
  const res = useQuery<CatalogString[]>({ queryKey: [`/api/strings?q=${encodeURIComponent(dq)}`], enabled: !value && dq.length >= 2, staleTime: 300_000 });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-ink bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {value.brandName} {value.model}
          </p>
          <p className="text-xs capitalize text-muted">
            {value.family}
            {value.setPriceCents != null ? ` · set ${cents(value.setPriceCents)}` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Change string" onClick={() => onChange(null)}>
          <X />
        </Button>
      </div>
    );
  }
  const list = (res.data ?? []).slice(0, 6);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search strings — e.g. RPM Blast" className="pl-11" aria-label="Search strings" />
      </div>
      {dq.length >= 2 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
          {res.isLoading ? (
            <li className="px-4 py-3 text-sm text-muted">Searching…</li>
          ) : list.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No match — leave it blank and add it to the notes.</li>
          ) : (
            list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => (onChange(s), setQ(""))}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {s.brandName} {s.model}
                    </span>
                    <span className="block text-xs capitalize text-muted">{s.family}</span>
                  </span>
                  {s.setPriceCents != null && <span className="shrink-0 text-sm tabular text-muted">{cents(s.setPriceCents)}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function WalkInSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [racket, setRacket] = React.useState("");
  const [string, setString] = React.useState<CatalogString | null>(null);
  const [own, setOwn] = React.useState(false);
  const [mains, setMains] = React.useState(52);
  const [crosses, setCrosses] = React.useState(52);
  const [linked, setLinked] = React.useState(true);
  const [rush, setRush] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<ApiError | Error | null>(null);

  const reset = () => {
    setName("");
    setPhone("");
    setRacket("");
    setString(null);
    setOwn(false);
    setMains(52);
    setCrosses(52);
    setLinked(true);
    setRush(false);
    setNotes("");
    setError(null);
  };

  const create = useMutation({
    mutationFn: () =>
      api("POST", "/api/shop/walk-ins", {
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        racketLabel: racket.trim(),
        stringId: string?.id,
        tensionMains: mains,
        tensionCrosses: linked ? mains : crosses,
        rush,
        playerSuppliesString: own,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`${name.trim().split(" ")[0]}'s racket is in the queue`);
      invalidateShop(qc);
      reset();
      onOpenChange(false);
    },
    onError: (e) => setError(e as Error),
  });

  const fieldError = (f: string) => (error instanceof ApiError && error.field === f ? error.message : null);
  const ready = name.trim().length > 0 && racket.trim().length > 0;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Walk-in"
      description="Racket on the counter? Get it in the queue in seconds."
      footer={
        <Button size="lg" className="w-full" disabled={!ready} loading={create.isPending} onClick={() => create.mutate()}>
          <Check /> Add to queue
        </Button>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) create.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" error={fieldError("customerName")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoComplete="off" autoCapitalize="words" />
          </Field>
          <Field label="Phone" optional>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="For the pickup call" autoComplete="off" />
          </Field>
        </div>
        <Field label="Racket" error={fieldError("racketLabel")}>
          <Input value={racket} onChange={(e) => setRacket(e.target.value)} placeholder="e.g. Pure Aero 98, black grip" autoComplete="off" />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-medium">String</p>
          <StringPicker value={string} onChange={setString} />
          <div className="pt-2">
            <Switch checked={own} onCheckedChange={setOwn} label="Player brought their own string" description="Labour only on the price." />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tension</p>
            <button
              type="button"
              onClick={() => {
                if (!linked) setCrosses(mains);
                setLinked(!linked);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:text-ink"
              aria-pressed={!linked}
            >
              {linked ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
              {linked ? "Same for crosses" : "Separate crosses"}
            </button>
          </div>
          <div className={cn("grid gap-3", !linked && "grid-cols-2")}>
            <Stepper
              label={linked ? "Mains & crosses" : "Mains"}
              value={mains}
              onChange={(v) => {
                setMains(v);
                if (linked) setCrosses(v);
              }}
            />
            {!linked && <Stepper label="Crosses" value={crosses} onChange={setCrosses} />}
          </div>
        </div>

        <Switch checked={rush} onCheckedChange={setRush} label="Rush job" description="Moves to the top of the queue and adds your rush fee." />

        <Field label="Notes" optional>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Grip change, stencil, frame damage…" autoComplete="off" />
        </Field>

        {error && !(error instanceof ApiError && error.field) && (
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand" role="alert">
            {errMsg(error)}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
