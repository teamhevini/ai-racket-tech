import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select, Switch, Textarea, UnitInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/surface";
import { ApiError } from "@/lib/api";
import { useSaveRacket } from "@/hooks/use-bag";
import { useDebounce } from "@/hooks/use-debounce";
import type { BagRacket, CatalogRacket } from "@/lib/types";
import { restringIntervalDays } from "@shared/reminders";
import { UpgradeCard } from "@/components/UpgradeCard";
import { cn } from "@/lib/utils";

type Values = {
  nickname: string;
  brand: string;
  model: string;
  headSize: string;
  stringPattern: string;
  weight: string;
  hoursPerWeek: string;
  restringIntervalDays: string;
  reminderEnabled: boolean;
  notes: string;
};

const empty: Values = {
  nickname: "",
  brand: "",
  model: "",
  headSize: "",
  stringPattern: "",
  weight: "",
  hoursPerWeek: "3",
  restringIntervalDays: "",
  reminderEnabled: true,
  notes: "",
};

const HOURS = [
  { v: "1.5", label: "1–2 h" },
  { v: "3", label: "3–4 h" },
  { v: "6", label: "5–7 h" },
  { v: "10", label: "8+ h" },
];

function fromCatalog(v: Values, r: CatalogRacket): Values {
  return {
    ...v,
    brand: r.brand,
    model: r.model,
    headSize: r.headSize ? String(r.headSize) : "",
    stringPattern: r.stringPattern ?? "",
    weight: r.weightUnstrung ? String(r.weightUnstrung) : "",
    nickname: v.nickname || r.model.replace(/\s+(v\d+|\d{4}).*$/i, ""),
  };
}

/** Add a racket to the bag (optionally picked from the catalog) or edit one. */
export function RacketForm({
  open,
  onOpenChange,
  racket,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  racket?: BagRacket | null;
  /** Prefill a new racket, e.g. from the catalog. */
  initial?: CatalogRacket | null;
  onSaved?: (r: BagRacket) => void;
}) {
  const [values, setValues] = React.useState<Values>(empty);
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<ApiError | Error | null>(null);
  const [customInterval, setCustomInterval] = React.useState(false);
  const debounced = useDebounce(query, 250);
  const save = useSaveRacket();

  const search = useQuery<CatalogRacket[]>({
    queryKey: [`/api/rackets/search?q=${encodeURIComponent(debounced)}`],
    enabled: open && !racket && debounced.trim().length >= 2,
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setQuery("");
    if (racket) {
      setValues({
        nickname: racket.nickname,
        brand: racket.brand ?? "",
        model: racket.model ?? "",
        headSize: racket.headSize ?? "",
        stringPattern: racket.stringPattern ?? "",
        weight: racket.weight ?? "",
        hoursPerWeek: racket.hoursPerWeek != null ? String(racket.hoursPerWeek) : "",
        restringIntervalDays: racket.restringIntervalDays != null ? String(racket.restringIntervalDays) : "",
        reminderEnabled: racket.reminderEnabled,
        notes: racket.notes ?? "",
      });
      setCustomInterval(racket.restringIntervalDays != null);
    } else {
      setValues(initial ? fromCatalog(empty, initial) : empty);
      setCustomInterval(false);
    }
  }, [open, racket, initial]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function pick(r: CatalogRacket) {
    setValues((v) => fromCatalog(v, r));
    setQuery("");
  }

  const autoDays = restringIntervalDays({
    hoursPerWeek: Number(values.hoursPerWeek) || null,
    mains: racket?.latestJob?.mains,
    crosses: racket?.latestJob?.crosses,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const saved = await save.mutateAsync({
        id: racket?.id,
        data: {
          ...values,
          hoursPerWeek: values.hoursPerWeek || null,
          restringIntervalDays: customInterval ? values.restringIntervalDays || null : null,
        },
      });
      toast.success(racket ? "Racket updated" : `${saved.nickname} added to your bag`);
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err as Error);
    }
  }

  const fieldError = (f: string) => (error instanceof ApiError && error.field === f ? error.message : null);
  const results = search.data ?? [];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={racket ? "Edit racket" : "Add a racket"}
      description={racket ? undefined : "Pick it from our catalog or type it in."}
      footer={
        <Button form="racket-form" type="submit" className="w-full" size="lg" loading={save.isPending}>
          {racket ? "Save changes" : "Add to my bag"}
        </Button>
      }
    >
      <form id="racket-form" onSubmit={submit} className="space-y-5">
        {!racket && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 140+ frames — e.g. Blade 98"
              className="pl-11"
              aria-label="Search racket catalog"
            />
            {query.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded-xl bg-surface p-1 shadow-lift ring-1 ring-line">
                {search.isLoading && <p className="px-3 py-2 text-sm text-muted">Searching…</p>}
                {!search.isLoading && results.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted">No match — just fill in the details below.</p>
                )}
                {results.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => pick(r)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {r.brand} {r.model}
                      </span>
                      <span className="text-xs text-muted">
                        {[r.headSize && `${r.headSize} in²`, r.stringPattern, r.weightUnstrung && `${r.weightUnstrung} g`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Nickname" hint="How you tell your rackets apart — “Match #1”, “The backup”." error={fieldError("nickname")}>
          <Input value={values.nickname} onChange={set("nickname")} placeholder="Match racket" required maxLength={60} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand" optional>
            <Input value={values.brand} onChange={set("brand")} placeholder="Wilson" />
          </Field>
          <Field label="Model" optional>
            <Input value={values.model} onChange={set("model")} placeholder="Blade 98 v9" />
          </Field>
          <Field label="Head size" optional>
            <UnitInput unit="in²" value={values.headSize} onChange={set("headSize")} placeholder="98" />
          </Field>
          <Field label="Pattern" optional>
            <Input value={values.stringPattern} onChange={set("stringPattern")} placeholder="16x19" />
          </Field>
        </div>

        <fieldset className="space-y-4 rounded-2xl bg-surface-2/60 p-4">
          <legend className="sr-only">Restring reminders</legend>
          <Switch
            checked={values.reminderEnabled}
            onCheckedChange={(v) => setValues((s) => ({ ...s, reminderEnabled: v }))}
            label="Restring reminders"
            description="We'll tell you when these strings are past their best."
          />
          <div className={cn("space-y-4 transition-opacity", !values.reminderEnabled && "pointer-events-none opacity-40")}>
            <div>
              <p className="mb-2 text-sm font-medium">How much do you play with it each week?</p>
              <div className="flex flex-wrap gap-2">
                {HOURS.map((h) => (
                  <Chip key={h.v} selected={values.hoursPerWeek === h.v} onClick={() => setValues((s) => ({ ...s, hoursPerWeek: h.v }))}>
                    {h.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">
                {customInterval ? "Your own schedule" : (
                  <>
                    Suggested: every <strong className="font-semibold text-ink">{autoDays} days</strong>
                  </>
                )}
              </span>
              <Button type="button" variant="link" size="sm" className="text-sm" onClick={() => setCustomInterval((c) => !c)}>
                {customInterval ? "Use suggestion" : "Set my own"}
              </Button>
            </div>
            {customInterval && (
              <Field label="Restring every" error={fieldError("restringIntervalDays")}>
                <Select value={values.restringIntervalDays || ""} onChange={set("restringIntervalDays")} required>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {[7, 14, 21, 28, 42, 56, 84, 120, 180].map((d) => (
                    <option key={d} value={d}>
                      {d % 7 === 0 ? `${d / 7} week${d === 7 ? "" : "s"}` : `${d} days`}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        </fieldset>

        <Field label="Notes" optional>
          <Textarea value={values.notes} onChange={set("notes")} rows={2} placeholder="Lead tape at 3 & 9, overgrip…" />
        </Field>

        {error && (error instanceof ApiError && error.upgrade ? (
          <UpgradeCard compact title="Your bag is full" body={error.message} />
        ) : !(error instanceof ApiError && error.field) ? (
          <p className="text-sm text-brand" role="alert">
            {error.message}
          </p>
        ) : null)}
      </form>
    </Sheet>
  );
}
