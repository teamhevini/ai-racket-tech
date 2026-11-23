import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useSaveStringer } from "@/hooks/use-bag";
import type { SavedStringerJson } from "@/lib/types";

type Values = {
  stringerName: string;
  stringerAddress: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  stringerPlaceId?: string | null;
};

const empty: Values = { stringerName: "", stringerAddress: "", phone: "", email: "", website: "", notes: "" };

/** Add or edit one of "my stringers". */
export function StringerForm({
  open,
  onOpenChange,
  stringer,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stringer?: SavedStringerJson | null;
  /** Prefill for a new stringer, e.g. from a search result. */
  initial?: Partial<Values>;
  onSaved?: (s: SavedStringerJson) => void;
}) {
  const [values, setValues] = React.useState<Values>(empty);
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const save = useSaveStringer();

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(
      stringer
        ? {
            stringerName: stringer.stringerName,
            stringerAddress: stringer.stringerAddress ?? "",
            phone: stringer.phone ?? "",
            email: stringer.email ?? "",
            website: stringer.website ?? "",
            notes: stringer.notes ?? "",
          }
        : { ...empty, ...initial },
    );
  }, [open, stringer, initial]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const saved = await save.mutateAsync({ id: stringer?.id, data: values });
      toast.success(stringer ? "Stringer updated" : "alreadySaved" in saved && saved.alreadySaved ? "Already in your stringers" : "Stringer saved");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, message: err instanceof Error ? err.message : "Couldn't save" });
    }
  }

  const fieldError = (f: string) => (error?.field === f ? error.message : null);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={stringer ? "Edit stringer" : "Save a stringer"}
      description="Keep the people you trust with your rackets one tap away."
      footer={
        <Button form="stringer-form" type="submit" className="w-full" size="lg" loading={save.isPending}>
          {stringer ? "Save changes" : "Save stringer"}
        </Button>
      }
    >
      <form id="stringer-form" onSubmit={submit} className="space-y-4">
        <Field label="Name" error={fieldError("stringerName")}>
          <Input value={values.stringerName} onChange={set("stringerName")} placeholder="Baseline Pro Shop" autoComplete="organization" required />
        </Field>
        <Field label="Address" optional error={fieldError("stringerAddress")}>
          <Input value={values.stringerAddress} onChange={set("stringerAddress")} placeholder="Street, city" autoComplete="street-address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" optional error={fieldError("phone")}>
            <Input value={values.phone} onChange={set("phone")} type="tel" inputMode="tel" placeholder="+1 555 0100" autoComplete="tel" />
          </Field>
          <Field label="Email" optional error={fieldError("email")}>
            <Input value={values.email} onChange={set("email")} type="email" inputMode="email" placeholder="shop@example.com" autoComplete="email" />
          </Field>
        </div>
        <Field label="Website or booking link" optional error={fieldError("website")}>
          <Input value={values.website} onChange={set("website")} type="url" inputMode="url" placeholder="https://" />
        </Field>
        <Field label="Notes" optional hint="Turnaround, who to ask for, what they charge, opening hours…">
          <Textarea value={values.notes} onChange={set("notes")} placeholder="Ask for Sam — same-day if dropped off before 10am." />
        </Field>
        {error && !error.field && (
          <p className="text-sm text-brand" role="alert">
            {error.message}
          </p>
        )}
      </form>
    </Sheet>
  );
}
