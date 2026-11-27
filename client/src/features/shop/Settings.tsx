import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea, UnitInput } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { useRefreshMe } from "@/hooks/use-me";
import type { ShopRecord } from "./types";
import { errMsg, invalidateShop } from "./util";

const dollars = (c: number) => (c / 100).toFixed(2);
const toCents = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
};

type Form = {
  name: string;
  slug: string;
  tagline: string;
  bio: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  certifications: string;
  machine: string;
  openingHours: string;
  labour: string;
  rush: string;
  turnaround: string;
};

const fromShop = (s: ShopRecord): Form => ({
  name: s.name,
  slug: s.slug,
  tagline: s.tagline ?? "",
  bio: s.bio ?? "",
  address: s.address ?? "",
  city: s.city ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  website: s.website ?? "",
  certifications: s.certifications ?? "",
  machine: s.machine ?? "",
  openingHours: s.openingHours ?? "",
  labour: dollars(s.labourCents),
  rush: dollars(s.rushCents),
  turnaround: String(s.turnaroundHours),
});

export function Settings({ shop }: { shop: ShopRecord }) {
  const qc = useQueryClient();
  const refreshMe = useRefreshMe();
  const [f, setF] = React.useState<Form>(() => fromShop(shop));
  const [error, setError] = React.useState<ApiError | Error | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const publicUrl = `${window.location.origin}/shops/${shop.slug}`;

  const save = useMutation({
    mutationFn: () =>
      api<ShopRecord>("PATCH", "/api/shop", {
        name: f.name,
        slug: f.slug.trim().toLowerCase() || undefined,
        tagline: f.tagline,
        bio: f.bio,
        address: f.address,
        city: f.city,
        phone: f.phone,
        email: f.email,
        website: f.website,
        certifications: f.certifications,
        machine: f.machine,
        openingHours: f.openingHours,
        labourCents: toCents(f.labour),
        rushCents: toCents(f.rush),
        turnaroundHours: parseInt(f.turnaround, 10) || undefined,
      }),
    onSuccess: (s) => {
      setError(null);
      setF(fromShop(s));
      toast.success("Shop profile saved");
      refreshMe();
    },
    onError: (e) => setError(e as Error),
  });

  const accepting = useMutation({
    mutationFn: (v: boolean) => api<ShopRecord>("PATCH", "/api/shop", { acceptingBookings: v }),
    onSuccess: (s) => {
      toast.success(s.acceptingBookings ? "You're taking bookings again" : "Bookings paused — your page says so");
      invalidateShop(qc);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const fieldError = (k: string) => (error instanceof ApiError && error.field === k ? error.message : null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — long-press the link instead");
    }
  };
  const acceptingNow = accepting.isPending ? !!accepting.variables : shop.acceptingBookings;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Card className="space-y-5 p-5 sm:p-6">
          <h2 className="display text-3xl">Profile</h2>
          <Field label="Shop name" error={fieldError("name")}>
            <Input value={f.name} onChange={set("name")} required />
          </Field>
          <Field label="Tagline" optional hint="One line on your public page.">
            <Input value={f.tagline} onChange={set("tagline")} placeholder="Tour-level stringing, same-day on request" maxLength={120} />
          </Field>
          <Field label="About" optional>
            <Textarea value={f.bio} onChange={set("bio")} rows={4} maxLength={1200} placeholder="Who strings, how long you've done it, what you're known for." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Certifications" optional>
              <Input value={f.certifications} onChange={set("certifications")} placeholder="USRSA Master Racquet Technician" />
            </Field>
            <Field label="Machine" optional>
              <Input value={f.machine} onChange={set("machine")} placeholder="Babolat Sensor Expert" />
            </Field>
          </div>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <h2 className="display text-3xl">Where & when</h2>
          <Field label="Address" optional>
            <Input value={f.address} onChange={set("address")} autoComplete="street-address" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" optional>
              <Input value={f.city} onChange={set("city")} autoComplete="address-level2" />
            </Field>
            <Field label="Opening hours" optional>
              <Input value={f.openingHours} onChange={set("openingHours")} placeholder="Tue–Sat 9–6" />
            </Field>
            <Field label="Phone" optional>
              <Input value={f.phone} onChange={set("phone")} type="tel" />
            </Field>
            <Field label="Email" optional>
              <Input value={f.email} onChange={set("email")} type="email" />
            </Field>
          </div>
          <Field label="Website" optional>
            <Input value={f.website} onChange={set("website")} type="url" placeholder="https://" />
          </Field>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <h2 className="display text-3xl">Prices & turnaround</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Labour" hint="Per racket, before string.">
              <UnitInput unit="USD" value={f.labour} onChange={set("labour")} />
            </Field>
            <Field label="Rush fee" hint="Added for rush jobs.">
              <UnitInput unit="USD" value={f.rush} onChange={set("rush")} />
            </Field>
            <Field label="Turnaround" hint="Standard, in hours.">
              <UnitInput unit="hrs" inputMode="numeric" value={f.turnaround} onChange={set("turnaround")} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-3 p-5 sm:p-6">
          <h2 className="display text-3xl">Page address</h2>
          <Field label="Public link" error={fieldError("slug")} hint="Letters, numbers and dashes. Changing it breaks old links.">
            <div className="flex items-center overflow-hidden rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <span className="shrink-0 pl-4 text-sm text-muted">/shops/</span>
              <input value={f.slug} onChange={set("slug")} className="h-12 min-w-0 flex-1 bg-transparent pr-4 text-ink focus:outline-none" />
            </div>
          </Field>
        </Card>

        {error && !(error instanceof ApiError && error.field) && (
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand" role="alert">
            {errMsg(error)}
          </p>
        )}
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
          <Button type="submit" size="lg" className="w-full sm:w-auto" loading={save.isPending}>
            Save changes
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card className="p-5">
          <Switch
            checked={acceptingNow}
            onCheckedChange={(v) => accepting.mutate(v)}
            disabled={accepting.isPending}
            label="Accepting bookings"
            description="Turn off for holidays or a full week. Walk-ins still work."
          />
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Your public page</p>
          <p className="mt-2 break-all font-mono text-sm">{publicUrl.replace(/^https?:\/\//, "")}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="ink" size="sm" onClick={copy}>
              <Copy /> Copy link
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/shops/${shop.slug}`}>
                <ExternalLink /> View
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Put it on your counter, Instagram bio or club noticeboard — players book straight into your queue.</p>
        </Card>
      </aside>
    </div>
  );
}
