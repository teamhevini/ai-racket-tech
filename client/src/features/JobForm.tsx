import * as React from "react";
import { toast } from "sonner";
import { Plus, Star } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select, Textarea, UnitInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Chip, Segmented } from "@/components/ui/surface";
import { ApiError } from "@/lib/api";
import { useMyStringers, useSaveJob } from "@/hooks/use-bag";
import { fromDateInput, toDateInput } from "@/lib/format";
import type { BagRacket, StringJobJson } from "@/lib/types";
import { StringerForm } from "./StringerForm";
import { cn } from "@/lib/utils";

type Values = {
  strungAt: string;
  mains: string;
  crosses: string;
  gauge: string;
  tensionMains: string;
  tensionCrosses: string;
  stringerId: string;
  price: string;
  rating: number | null;
  notes: string;
};

export interface JobPrefill {
  mains?: string;
  crosses?: string;
  gauge?: string;
  tensionMains?: string;
  tensionCrosses?: string;
  recommendationRunId?: number;
}

const GAUGES = ["15L", "16", "16L", "17", "18"];

/** Log a restring (or edit an existing history entry). */
export function JobForm({
  open,
  onOpenChange,
  racket,
  job,
  prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  racket: Pick<BagRacket, "id" | "nickname" | "latestJob">;
  job?: StringJobJson | null;
  prefill?: JobPrefill;
}) {
  const [values, setValues] = React.useState<Values>(() => blank());
  const [hybrid, setHybrid] = React.useState<"full" | "hybrid">("full");
  const [error, setError] = React.useState<ApiError | Error | null>(null);
  const [addingStringer, setAddingStringer] = React.useState(false);
  const stringers = useMyStringers(open);
  const save = useSaveJob();

  function blank(): Values {
    return {
      strungAt: toDateInput(),
      mains: "",
      crosses: "",
      gauge: "",
      tensionMains: "",
      tensionCrosses: "",
      stringerId: "",
      price: "",
      rating: null,
      notes: "",
    };
  }

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    const source = job ?? null;
    const last = racket.latestJob;
    if (source) {
      setValues({
        strungAt: toDateInput(source.strungAt),
        mains: source.mains ?? "",
        crosses: source.crosses ?? "",
        gauge: source.gauge ?? "",
        tensionMains: source.tensionMains != null ? String(source.tensionMains) : "",
        tensionCrosses: source.tensionCrosses != null ? String(source.tensionCrosses) : "",
        stringerId: source.stringerId ? String(source.stringerId) : "",
        price: source.price != null ? String(source.price) : "",
        rating: source.rating ?? null,
        notes: source.notes ?? "",
      });
      setHybrid(source.crosses && source.crosses !== source.mains ? "hybrid" : "full");
    } else {
      // A new job starts from the recommendation or the last setup — most people re-use it.
      const base = prefill ?? {
        mains: last?.mains ?? "",
        crosses: last?.crosses ?? "",
        gauge: last?.gauge ?? "",
        tensionMains: last?.tensionMains != null ? String(last.tensionMains) : "",
        tensionCrosses: last?.tensionCrosses != null ? String(last.tensionCrosses) : "",
      };
      setValues({
        ...blank(),
        mains: base.mains ?? "",
        crosses: base.crosses ?? "",
        gauge: base.gauge ?? "",
        tensionMains: base.tensionMains ?? "",
        tensionCrosses: base.tensionCrosses ?? "",
        stringerId: last?.stringerId ? String(last.stringerId) : "",
        price: last?.price != null ? String(last.price) : "",
      });
      setHybrid(base.crosses && base.crosses !== base.mains ? "hybrid" : "full");
    }
  }, [open, job, racket, prefill]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const full = hybrid === "full";
    try {
      await save.mutateAsync({
        racketId: racket.id,
        jobId: job?.id,
        data: {
          // Sent as ISO text; the server coerces it to a Date.
          strungAt: fromDateInput(values.strungAt) as unknown as Date,
          mains: values.mains,
          crosses: full ? null : values.crosses,
          gauge: values.gauge,
          tensionMains: values.tensionMains || null,
          tensionCrosses: full ? null : values.tensionCrosses || null,
          stringerId: values.stringerId ? Number(values.stringerId) : null,
          price: values.price || null,
          rating: values.rating,
          notes: values.notes,
          ...(prefill?.recommendationRunId && !job ? { recommendationRunId: prefill.recommendationRunId } : {}),
        },
      });
      toast.success(job ? "History updated" : `Restring logged for ${racket.nickname}`, {
        description: job ? undefined : "Your reminder clock has been reset.",
      });
      onOpenChange(false);
    } catch (err) {
      setError(err as Error);
    }
  }

  const fieldError = (f: string) => (error instanceof ApiError && error.field === f ? error.message : null);

  return (
    <>
      <Sheet
        open={open && !addingStringer}
        onOpenChange={onOpenChange}
        title={job ? "Edit restring" : "Log a restring"}
        description={job ? racket.nickname : `Fresh strings in ${racket.nickname}`}
        footer={
          <Button form="job-form" type="submit" className="w-full" size="lg" loading={save.isPending}>
            {job ? "Save changes" : "Log restring"}
          </Button>
        }
      >
        <form id="job-form" onSubmit={submit} className="space-y-5">
          <Field label="Date strung" error={fieldError("strungAt")}>
            <Input type="date" value={values.strungAt} max={toDateInput()} onChange={set("strungAt")} required />
          </Field>

          <Segmented
            label="String setup"
            value={hybrid}
            onChange={setHybrid}
            className="w-full"
            options={[
              { value: "full", label: "Full bed" },
              { value: "hybrid", label: "Hybrid" },
            ]}
          />

          <div className={cn("grid gap-3", hybrid === "hybrid" && "sm:grid-cols-2")}>
            <Field label={hybrid === "hybrid" ? "Mains" : "String"} error={fieldError("mains")}>
              <Input value={values.mains} onChange={set("mains")} placeholder="Luxilon ALU Power" autoCapitalize="words" />
            </Field>
            {hybrid === "hybrid" && (
              <Field label="Crosses" error={fieldError("crosses")}>
                <Input value={values.crosses} onChange={set("crosses")} placeholder="Babolat VS Touch" autoCapitalize="words" />
              </Field>
            )}
          </div>

          <div className={cn("grid gap-3", hybrid === "hybrid" ? "grid-cols-2" : "grid-cols-1")}>
            <Field label={hybrid === "hybrid" ? "Mains tension" : "Tension"} error={fieldError("tensionMains")}>
              <UnitInput unit="lbs" value={values.tensionMains} onChange={set("tensionMains")} placeholder="52" />
            </Field>
            {hybrid === "hybrid" && (
              <Field label="Crosses tension" error={fieldError("tensionCrosses")}>
                <UnitInput unit="lbs" value={values.tensionCrosses} onChange={set("tensionCrosses")} placeholder="50" />
              </Field>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Gauge</p>
            <div className="flex flex-wrap gap-2">
              {GAUGES.map((g) => (
                <Chip key={g} selected={values.gauge === g} onClick={() => setValues((v) => ({ ...v, gauge: v.gauge === g ? "" : g }))}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Stringer" optional>
              <Select value={values.stringerId} onChange={set("stringerId")}>
                <option value="">{stringers.data?.length ? "Choose…" : "None saved yet"}</option>
                {stringers.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stringerName}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="secondary" size="icon" onClick={() => setAddingStringer(true)} aria-label="Add a new stringer">
              <Plus />
            </Button>
          </div>

          <Field label="Price" optional error={fieldError("price")}>
            <UnitInput unit="USD" value={values.price} onChange={set("price")} placeholder="28" />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">
              How did it play? <span className="font-normal text-faint">Optional</span>
            </p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={values.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setValues((v) => ({ ...v, rating: v.rating === n ? null : n }))}
                  className="grid size-11 place-items-center rounded-full transition-transform active:scale-90"
                >
                  <Star className={cn("size-6 transition-colors", values.rating && n <= values.rating ? "fill-ball stroke-ball-ink/60" : "text-line")} />
                </button>
              ))}
            </div>
          </div>

          <Field label="Notes" optional>
            <Textarea value={values.notes} onChange={set("notes")} rows={2} placeholder="Felt boardy after 10 hours, try 2 lbs lower next time." />
          </Field>

          {error && !(error instanceof ApiError && error.field) && (
            <p className="text-sm text-brand" role="alert">
              {error.message}
            </p>
          )}
        </form>
      </Sheet>
      <StringerForm
        open={addingStringer}
        onOpenChange={setAddingStringer}
        onSaved={(s) => setValues((v) => ({ ...v, stringerId: String(s.id) }))}
      />
    </>
  );
}
