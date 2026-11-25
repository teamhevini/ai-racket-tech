import * as React from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Minus, Package, Plus, Search, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Chip, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { useBag } from "@/hooks/use-bag";
import { useDebounce } from "@/hooks/use-debounce";
import { api, ApiError } from "@/lib/api";
import { fromDateInput, racketName, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cents, stringName, type BookingPrefill, type CatalogString, type MarketShop, type StringDetailResponse } from "./types";

export type BookingSheetShop = Pick<MarketShop, "slug" | "name" | "labourCents" | "rushCents" | "turnaroundHours"> &
  Partial<Pick<MarketShop, "acceptingBookings">>;

type StringChoice =
  | { kind: "none" }
  | { kind: "catalog"; string: Pick<CatalogString, "id" | "brandName" | "model" | "family" | "setPriceCents"> }
  | { kind: "text"; mains: string; crosses?: string | null }
  | { kind: "own"; label: string };

const DEFAULT_TENSION = 52;
const DAYS = 14;

function dayChips() {
  const out: Array<{ value: string; top: string; bottom: string }> = [];
  const wk = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  for (let i = 0; i < DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ value: toDateInput(d), top: i === 0 ? "Today" : i === 1 ? "Tmrw" : wk.format(d), bottom: String(d.getDate()) });
  }
  return out;
}

function readyBy(day: string, shop: BookingSheetShop, rush: boolean) {
  const hours = rush ? Math.max(4, Math.round(shop.turnaroundHours / 2)) : shop.turnaroundHours;
  const d = new Date(new Date(fromDateInput(day)).getTime() + hours * 3_600_000);
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric" }).format(d);
}

/**
 * Book a restring at a 10IS shop. Bottom sheet on phones.
 * Pre-fill comes from a reminder, a recommendation, a sample programme or a string page.
 */
export function BookingSheet({
  open,
  onOpenChange,
  shop,
  prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: BookingSheetShop;
  prefill?: BookingPrefill;
}) {
  const { signedIn, loading: meLoading } = useMe();
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const bag = useBag(open && signedIn);
  const rackets = bag.data?.rackets ?? [];
  const sample = !!prefill?.sampleProgramId;

  const [racketId, setRacketId] = React.useState<number | "other" | null>(null);
  const [racketLabel, setRacketLabel] = React.useState("");
  const [choice, setChoice] = React.useState<StringChoice>({ kind: "none" });
  const [picking, setPicking] = React.useState(false);
  const [mains, setMains] = React.useState(DEFAULT_TENSION);
  const [crosses, setCrosses] = React.useState(DEFAULT_TENSION);
  const [day, setDay] = React.useState(() => toDateInput());
  const [rush, setRush] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [shareHistory, setShareHistory] = React.useState(true);
  const [error, setError] = React.useState<{ message: string; field?: string } | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Resolve a pre-filled catalogue string so we can show its name and set price.
  const prefString = useQuery<StringDetailResponse>({
    queryKey: [`/api/strings/${prefill?.stringId}`],
    enabled: open && !!prefill?.stringId,
  });

  // Reset from the pre-fill every time the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setPicking(false);
    setRush(false);
    setNotes("");
    setShareHistory(true);
    setDay(toDateInput());
    const tm = prefill?.tensionMains ?? DEFAULT_TENSION;
    setMains(tm);
    setCrosses(prefill?.tensionCrosses ?? tm);
    setRacketId(prefill?.savedRacketId ?? null);
    setRacketLabel(prefill?.racketLabel ?? "");
    if (prefill?.stringId) setChoice({ kind: "none" }); // filled in once the string loads
    else if (prefill?.mains) setChoice({ kind: "text", mains: prefill.mains, crosses: prefill.crosses });
    else setChoice({ kind: "none" });
  }, [open, prefill]);

  React.useEffect(() => {
    if (open && prefString.data && prefill?.stringId === prefString.data.id) {
      setChoice({ kind: "catalog", string: prefString.data });
    }
  }, [open, prefString.data, prefill?.stringId]);

  // Default to the only racket in the bag.
  React.useEffect(() => {
    if (open && racketId === null && !prefill?.racketLabel && rackets.length === 1) setRacketId(rackets[0].id);
  }, [open, racketId, rackets, prefill?.racketLabel]);

  const stringCents = choice.kind === "catalog" ? (choice.string.setPriceCents ?? 0) : 0;
  const rushCents = rush ? shop.rushCents : 0;
  const total = sample ? 0 : shop.labourCents + stringCents + rushCents;

  function setMainsLinked(v: number) {
    if (crosses === mains) setCrosses(v);
    setMains(v);
  }

  async function submit() {
    setError(null);
    const savedRacketId = typeof racketId === "number" ? racketId : null;
    if (!savedRacketId && !racketLabel.trim()) {
      setError({ message: "Which racket? Pick one from your bag or name it.", field: "racketLabel" });
      return;
    }
    setSaving(true);
    try {
      await api("POST", `/api/shops/${shop.slug}/bookings`, {
        savedRacketId,
        racketLabel: savedRacketId ? undefined : racketLabel.trim(),
        stringId: choice.kind === "catalog" ? choice.string.id : undefined,
        mains: choice.kind === "text" ? choice.mains : choice.kind === "own" && choice.label.trim() ? choice.label.trim() : undefined,
        crosses: choice.kind === "text" && choice.crosses ? choice.crosses : undefined,
        gauge: prefill?.gauge ?? undefined,
        tensionMains: mains,
        tensionCrosses: crosses,
        playerSuppliesString: choice.kind === "own",
        rush,
        dropOffAt: fromDateInput(day),
        notes: notes.trim() || undefined,
        shareHistory,
        recommendationRunId: prefill?.recommendationRunId ?? undefined,
        sampleProgramId: prefill?.sampleProgramId ?? undefined,
        affiliateCode: prefill?.affiliateCode ?? undefined,
        source: sample ? "sample" : (prefill?.source ?? "app"),
      });
      await qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/bookings") });
      toast.success(`Booked with ${shop.name}`, { description: "We'll update you as it moves through the shop." });
      onOpenChange(false);
      navigate("/bookings");
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setError({ message: e instanceof Error ? e.message : "Couldn't book that.", field: err?.field });
    } finally {
      setSaving(false);
    }
  }

  const title = sample ? "Claim your sample" : `Book ${shop.name}`;

  if (!meLoading && !signedIn) {
    const next = encodeURIComponent(location + window.location.search);
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={title} description="Join free to book and track your restring.">
        <div className="space-y-3 pb-2">
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Your account keeps the booking, live status from the shop, and the racket's string history in one place.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/signup?next=${next}`}>Join free to book</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href={`/login?next=${next}`}>I have an account</Link>
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={shop.acceptingBookings === false ? "This shop isn't taking online bookings right now." : `Ready in about ${shop.turnaroundHours} hours after drop-off.`}
      footer={
        <div className="space-y-3">
          <PriceSummary
            sample={sample}
            labour={shop.labourCents}
            stringLabel={choice.kind === "catalog" ? stringName(choice.string) : null}
            stringCents={stringCents}
            rushCents={rushCents}
            total={total}
          />
          {error && !error.field && (
            <p className="text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={submit} loading={saving} disabled={shop.acceptingBookings === false}>
            {sample ? "Claim free restring" : `Request booking · ${cents(total)}`}
          </Button>
          <p className="text-center text-2xs text-faint">You pay the shop at pick-up. Cancel free until it's on the machine.</p>
        </div>
      }
    >
      <div className="space-y-7">
        {sample && prefill?.sampleTitle && (
          <div className="flex gap-3 rounded-2xl bg-ball/25 px-4 py-3 text-sm">
            <Gift className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">{prefill.sampleTitle}</span>
              <span className="block text-xs text-muted">Brand-funded sample. The brand pays the stringer; you pay nothing.</span>
            </p>
          </div>
        )}

        {/* Racket */}
        <section aria-labelledby="bk-racket">
          <h3 id="bk-racket" className="mb-2.5 text-sm font-semibold">
            Racket
          </h3>
          {bag.isLoading ? (
            <Skeleton className="h-11 w-full rounded-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {rackets.map((r) => (
                <Chip key={r.id} selected={racketId === r.id} onClick={() => setRacketId(r.id)} className="max-w-full truncate">
                  {r.nickname}
                  {racketName(r) && <span className={cn("ml-1.5 text-xs", racketId === r.id ? "text-bg/60" : "text-muted")}>{racketName(r)}</span>}
                </Chip>
              ))}
              <Chip selected={racketId === "other" || (racketId === null && !!racketLabel)} onClick={() => setRacketId("other")}>
                {rackets.length ? "Another racket" : "Name your racket"}
              </Chip>
            </div>
          )}
          {(racketId === "other" || (racketId === null && (rackets.length === 0 || !!racketLabel))) && (
            <Input
              className="mt-3"
              placeholder="e.g. Babolat Pure Aero 98"
              value={racketLabel}
              onChange={(e) => setRacketLabel(e.target.value)}
              aria-invalid={error?.field === "racketLabel" || error?.field === "savedRacketId" || undefined}
              aria-label="Racket"
            />
          )}
          {(error?.field === "racketLabel" || error?.field === "savedRacketId") && (
            <p className="mt-2 text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
        </section>

        {/* String */}
        <section aria-labelledby="bk-string">
          <h3 id="bk-string" className="mb-2.5 text-sm font-semibold">
            String
          </h3>
          {sample ? (
            <StringRow
              title={choice.kind === "catalog" ? stringName(choice.string) : "Sample string"}
              sub="Supplied free by the brand"
              icon={<Gift />}
            />
          ) : picking ? (
            <StringPicker
              onPick={(s) => {
                setChoice(s ? { kind: "catalog", string: s } : { kind: "own", label: "" });
                setPicking(false);
              }}
              onCancel={() => setPicking(false)}
            />
          ) : (
            <>
              {choice.kind === "catalog" && (
                <StringRow
                  title={stringName(choice.string)}
                  sub={`${choice.string.family}${choice.string.setPriceCents ? ` · ${cents(choice.string.setPriceCents)} a set` : ""}`}
                  onChange={() => setPicking(true)}
                />
              )}
              {choice.kind === "text" && (
                <StringRow
                  title={choice.crosses ? `${choice.mains} / ${choice.crosses}` : choice.mains}
                  sub="From your setup — the shop confirms the price"
                  onChange={() => setPicking(true)}
                />
              )}
              {choice.kind === "own" && (
                <div className="space-y-2">
                  <StringRow title="I'll bring my own string" sub="Labour only" icon={<Package />} onChange={() => setPicking(true)} />
                  <Input
                    placeholder="Which string? (optional)"
                    value={choice.label}
                    onChange={(e) => setChoice({ kind: "own", label: e.target.value })}
                    aria-label="Which string you're bringing"
                  />
                </div>
              )}
              {choice.kind === "none" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setPicking(true)}>
                    <Search /> Choose string
                  </Button>
                  <Button variant="outline" onClick={() => setChoice({ kind: "own", label: "" })}>
                    <Package /> Bring my own
                  </Button>
                  <p className="col-span-2 text-xs text-muted">Or leave it — the stringer will help you choose at drop-off.</p>
                </div>
              )}
            </>
          )}
          {error?.field === "stringId" && (
            <p className="mt-2 text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
        </section>

        {/* Tension */}
        <section aria-labelledby="bk-tension">
          <h3 id="bk-tension" className="mb-2.5 text-sm font-semibold">
            Tension
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Mains" value={mains} onChange={setMainsLinked} />
            <Stepper label="Crosses" value={crosses} onChange={setCrosses} />
          </div>
          {(error?.field === "tensionMains" || error?.field === "tensionCrosses") && (
            <p className="mt-2 text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
        </section>

        {/* Drop-off */}
        <section aria-labelledby="bk-day">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 id="bk-day" className="text-sm font-semibold">
              Drop-off day
            </h3>
            <span className="text-xs text-muted">Ready ~ {readyBy(day, shop, rush)}</span>
          </div>
          <div role="radiogroup" aria-label="Drop-off day" className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
            {dayChips().map((d) => {
              const on = d.value === day;
              return (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDay(d.value)}
                  className={cn(
                    "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border transition-all duration-200 ease-spring active:scale-95",
                    on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink/30",
                  )}
                >
                  <span className={cn("text-2xs font-semibold uppercase", on ? "text-bg/70" : "text-muted")}>{d.top}</span>
                  <span className="font-mono text-lg font-semibold tabular">{d.bottom}</span>
                </button>
              );
            })}
          </div>
          {error?.field === "dropOffAt" && (
            <p className="mt-2 text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
        </section>

        {/* Extras */}
        <section className="space-y-5 rounded-2xl bg-surface-2/60 p-4">
          {!sample && (
            <Switch
              checked={rush}
              onCheckedChange={setRush}
              label={`Rush job · +${cents(shop.rushCents)}`}
              description={`Roughly twice as fast — about ${Math.max(4, Math.round(shop.turnaroundHours / 2))} hours.`}
            />
          )}
          <Switch
            checked={shareHistory}
            onCheckedChange={setShareHistory}
            label="Let the stringer see this racket's string history"
            description="Only this shop, only for this racket, so they can match what's worked before. Turn it off any time."
          />
        </section>

        <Field label="Notes for the stringer" optional>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Grip change, pre-stretch, logo stencil…" maxLength={600} />
        </Field>
      </div>
    </Sheet>
  );
}

function PriceSummary({
  sample,
  labour,
  stringLabel,
  stringCents,
  rushCents,
  total,
}: {
  sample: boolean;
  labour: number;
  stringLabel: string | null;
  stringCents: number;
  rushCents: number;
  total: number;
}) {
  if (sample) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Brand-funded sample</span>
        <span className="font-mono font-semibold tabular text-grass">Free</span>
      </div>
    );
  }
  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted">Labour</dt>
        <dd className="font-mono tabular">{cents(labour)}</dd>
      </div>
      {stringCents > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="truncate text-muted">{stringLabel}</dt>
          <dd className="font-mono tabular">{cents(stringCents)}</dd>
        </div>
      )}
      {rushCents > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Rush</dt>
          <dd className="font-mono tabular">{cents(rushCents)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold">
        <dt>Estimated total</dt>
        <dd className="font-mono tabular">{cents(total)}</dd>
      </div>
    </dl>
  );
}

function StringRow({ title, sub, icon, onChange }: { title: string; sub: string; icon?: React.ReactNode; onChange?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-4 py-3">
      {icon && <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-muted [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
      {onChange && (
        <Button variant="ghost" size="sm" onClick={onChange}>
          Change
        </Button>
      )}
    </div>
  );
}

function StringPicker({ onPick, onCancel }: { onPick: (s: CatalogString | null) => void; onCancel: () => void }) {
  const [q, setQ] = React.useState("");
  const dq = useDebounce(q.trim(), 250);
  const list = useQuery<CatalogString[]>({ queryKey: [`/api/strings?q=${encodeURIComponent(dq)}&limit=40`] });
  return (
    <div className="rounded-2xl ring-1 ring-line">
      <div className="relative p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input autoFocus className="pl-10 pr-12" placeholder="Search strings or brands" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search strings" />
        <button type="button" onClick={onCancel} aria-label="Close string search" className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2">
          <X className="size-4" />
        </button>
      </div>
      <ul className="max-h-64 overflow-y-auto border-t border-line p-1">
        <li>
          <button type="button" onClick={() => onPick(null)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2">
            <Package className="size-4 text-muted" />
            <span className="font-medium">I'll bring my own string</span>
          </button>
        </li>
        {list.isLoading ? (
          <li className="space-y-1 p-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </li>
        ) : (list.data ?? []).length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted">No strings match "{dq}".</li>
        ) : (
          list.data!.slice(0, 40).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{stringName(s)}</span>
                  <span className="text-xs capitalize text-muted">{s.family}</span>
                </span>
                {s.setPriceCents != null && <span className="shrink-0 font-mono text-sm tabular text-muted">{cents(s.setPriceCents)}</span>}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(80, Math.max(30, Math.round(v * 2) / 2));
  return (
    <div className="rounded-2xl bg-surface-2/60 p-3 text-center">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`Lower ${label.toLowerCase()} tension`}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-surface shadow-card ring-1 ring-line transition-transform active:scale-90"
        >
          <Minus className="size-5" />
        </button>
        <p className="min-w-0 leading-none" aria-live="polite">
          <span className="block font-mono text-3xl font-semibold tabular">{value}</span>
          <span className="mt-1 block text-2xs uppercase tracking-wide text-muted">lbs</span>
        </p>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`Raise ${label.toLowerCase()} tension`}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-surface shadow-card ring-1 ring-line transition-transform active:scale-90"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

