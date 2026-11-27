import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FlaskConical, Pencil, Plus } from "lucide-react";
import type { StringFamily } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Badge, Card, EmptyState } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { brandMeKey, cap, dollars, errMsg, Note, toCents, type BrandString } from "./shared";

const SPEC_NOTE = "Lab specs are set by 10IS so sponsored fit checks stay honest.";
// Mirrors stringFamilies in shared/schema (kept local so drizzle stays out of the client bundle).
const stringFamilies: StringFamily[] = ["polyester", "co-polyester", "multifilament", "synthetic gut", "natural gut", "hybrid"];
const SCORES = ["comfort", "spin", "control", "power", "durability"] as const;

export function CatalogueTab({ strings }: { strings: BrandString[] }) {
  const [editing, setEditing] = React.useState<BrandString | "new" | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="display text-4xl leading-tight">Catalogue</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">Names, gauges, prices and descriptions are yours to edit. {SPEC_NOTE}</p>
        </div>
        {strings.length > 0 && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add string
          </Button>
        )}
      </div>

      {strings.length === 0 ? (
        <EmptyState
          icon={<FlaskConical />}
          title="List your first string"
          body="Add a string and 10IS will review its lab specs so the technician can recommend it."
          action={
            <Button size="lg" onClick={() => setEditing("new")}>
              <Plus /> Add string
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {strings.map((s) => (
            <StringCard key={s.id} s={s} onEdit={() => setEditing(s)} />
          ))}
        </div>
      )}

      <StringSheet value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function StringCard({ s, onEdit }: { s: BrandString; onEdit: () => void }) {
  const pending = s.stiffness == null;
  return (
    <Card className={cn("flex flex-col p-5", !s.active && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{s.family}</p>
          <h3 className="display mt-1 text-2xl leading-tight">{s.model}</h3>
          <p className="mt-1 text-sm text-muted">
            {[s.gauges && `Gauges ${s.gauges}`, s.setPriceCents != null && `${dollars(s.setPriceCents)} a set`].filter(Boolean).join(" · ") || "No gauges or price yet"}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.model}`} onClick={onEdit}>
          <Pencil />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {!s.active && <Badge>Hidden</Badge>}
        {pending ? <Badge tone="clay">Specs pending review</Badge> : <Badge tone="grass">{s.stiffness} lb/in</Badge>}
      </div>
      <SpecGrid s={s} />
    </Card>
  );
}

function SpecGrid({ s }: { s: BrandString }) {
  return (
    <dl className="mt-4 grid grid-cols-5 gap-2 border-t border-line pt-4">
      {SCORES.map((k) => {
        const v = s[k];
        return (
          <div key={k} className="min-w-0 text-center">
            <dt className="truncate text-[10px] uppercase tracking-wider text-faint">{k}</dt>
            <dd className="mt-1 font-mono text-sm tabular">{v ?? "—"}</dd>
            <div className="mx-auto mt-1.5 h-1 w-full max-w-[3rem] overflow-hidden rounded-full bg-surface-2">
              {v != null && <div className="h-full rounded-full bg-ink/70" style={{ width: `${v * 10}%` }} />}
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function StringSheet({ value, onClose }: { value: BrandString | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = value === "new";
  const s = value && value !== "new" ? value : null;
  const [f, setF] = React.useState({ model: "", family: "polyester", gauges: "", price: "", description: "", active: true });
  const [err, setErr] = React.useState<{ field?: string; message: string } | null>(null);

  React.useEffect(() => {
    if (!value) return;
    setErr(null);
    setF(
      s
        ? { model: s.model, family: s.family, gauges: s.gauges ?? "", price: s.setPriceCents != null ? (s.setPriceCents / 100).toFixed(2) : "", description: s.description ?? "", active: s.active }
        : { model: "", family: "polyester", gauges: "", price: "", description: "", active: true },
    );
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => {
      const cents = f.price.trim() ? toCents(f.price) : null;
      if (cents != null && Number.isNaN(cents)) throw new ApiError("Enter a price like 18.50", 400, { field: "price" });
      const body = { model: f.model, gauges: f.gauges || null, setPriceCents: cents, description: f.description || null, active: f.active };
      return isNew ? api("POST", "/api/brand/strings", { ...body, family: f.family }) : api("PATCH", `/api/brand/strings/${s!.id}`, body);
    },
    onSuccess: () => {
      toast.success(isNew ? "String added. 10IS will review its specs." : "String saved");
      qc.invalidateQueries({ queryKey: brandMeKey });
      onClose();
    },
    onError: (e) => setErr({ field: e instanceof ApiError ? e.field : undefined, message: errMsg(e) }),
  });

  return (
    <Sheet
      open={!!value}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Add a string" : "Edit string"}
      description={isNew ? "10IS sets the lab specs after a quick review." : undefined}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.model.trim()}>
            {isNew ? "Add string" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Model" error={err?.field === "model" ? err.message : null}>
          <Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} placeholder="e.g. Element 1.25" maxLength={80} />
        </Field>
        <Field label="Family" hint={isNew ? undefined : "Family can't change after listing, since it feeds the fit check."}>
          <Select value={f.family} onChange={(e) => setF({ ...f, family: e.target.value })} disabled={!isNew}>
            {stringFamilies.map((x) => (
              <option key={x} value={x}>
                {cap(x)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gauges" optional>
            <Input value={f.gauges} onChange={(e) => setF({ ...f, gauges: e.target.value })} placeholder="16, 17, 1.25" />
          </Field>
          <Field label="Set price" optional error={err?.field === "price" || err?.field === "setPriceCents" ? err.message : null}>
            <Input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="$18.50" />
          </Field>
        </div>
        <Field label="Description" optional>
          <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={600} />
        </Field>
        <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} label="Listed" description="Hidden strings aren't recommended or shown on your page." />

        {s && (
          <div className="rounded-2xl bg-surface-2/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Lab specs</p>
              {s.stiffness == null ? <Badge tone="clay">Specs pending review</Badge> : <span className="font-mono text-sm tabular">{s.stiffness} lb/in</span>}
            </div>
            <SpecGrid s={s} />
            <Note className="mt-3">{SPEC_NOTE} Think a number is off? Email partners@10is.app with the test data.</Note>
          </div>
        )}
        {err && !["model", "price", "setPriceCents"].includes(err.field ?? "") && (
          <p className="text-sm text-brand" role="alert">
            {err.message}
          </p>
        )}
      </form>
    </Sheet>
  );
}
