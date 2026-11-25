import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Redirect, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, CalendarCheck, ClipboardList, History, Store } from "lucide-react";
import { FREE_SHOP_MONTHLY_BOOKINGS } from "@shared/tiers";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Field, Input, UnitInput } from "@/components/ui/field";
import { Card, Chip, Skeleton } from "@/components/ui/surface";
import { api, ApiError } from "@/lib/api";
import { useMe, useRefreshMe } from "@/hooks/use-me";

const TURNAROUNDS = [
  { hours: 24, label: "Next day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "1 week" },
];

const PERKS = [
  { icon: CalendarCheck, title: "A booking page players find", body: "Your shop shows up when 10IS players look for a stringer — with your prices and turnaround." },
  { icon: ClipboardList, title: "A queue for one hand", body: "Huge tensions, one tap to move a job on. Players see status live, so the phone stops ringing." },
  { icon: History, title: "Every racket's story", body: "Your notes and past jobs on each customer's racket, ready the next time it's on your bench." },
];

export default function ShopNew() {
  const { me, signedIn, loading } = useMe();
  const refreshMe = useRefreshMe();
  const [, navigate] = useLocation();
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [labour, setLabour] = React.useState("20");
  const [turnaround, setTurnaround] = React.useState(48);
  const [certifications, setCertifications] = React.useState("");
  const [machine, setMachine] = React.useState("");
  const [error, setError] = React.useState<ApiError | Error | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const l = parseFloat(labour);
      return api("POST", "/api/shop", {
        name: name.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        labourCents: Number.isFinite(l) ? Math.round(l * 100) : undefined,
        turnaroundHours: turnaround,
        certifications: certifications.trim() || undefined,
        machine: machine.trim() || undefined,
        acceptingBookings: true,
      });
    },
    onSuccess: async () => {
      await refreshMe();
      toast.success(`${name.trim()} is open`, { description: "Add your first walk-in or share your page to start taking bookings." });
      navigate("/shop");
    },
    onError: (e) => {
      // Someone who already has a shop just goes to it.
      if (e instanceof ApiError && e.status === 409 && !e.field) {
        refreshMe();
        navigate("/shop");
        return;
      }
      setError(e as Error);
    },
  });

  if (me.shop) return <Redirect to="/shop" />;

  const fieldError = (f: string) => (error instanceof ApiError && error.field === f ? error.message : null);

  return (
    <Page>
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
        <section className="animate-fade-up lg:pt-6">
          <p className="eyebrow">10IS for Business</p>
          <h1 className="display mt-3 text-[2.75rem] leading-[1.02] sm:text-6xl">
            Open your <em className="text-brand">stringing</em> shop.
          </h1>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
            Two minutes to set up. Free for your first {FREE_SHOP_MONTHLY_BOOKINGS} app bookings every month, with unlimited walk-ins.
          </p>
          <ul className="mt-8 hidden space-y-5 sm:block">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card ring-1 ring-line">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 max-w-md text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="animate-fade-up [animation-delay:80ms]">
          {loading ? (
            <Skeleton className="h-[34rem] rounded-3xl" />
          ) : !signedIn ? (
            <Card className="p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-full bg-brand text-brand-ink">
                <Store className="size-5" />
              </span>
              <h2 className="display mt-5 text-3xl">First, your account</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Your shop lives on a 10IS account — the same one you'd use as a player. Create one free, then come straight back here.</p>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild size="lg">
                  <Link href="/signup?next=/shop/new">
                    Create a free account <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/login?next=/shop/new">I already have an account</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 sm:p-8">
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  create.mutate();
                }}
              >
                <h2 className="display text-3xl">Your shop</h2>
                <Field label="Shop name" error={fieldError("name")}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Baseline Stringing" required minLength={2} maxLength={80} autoCapitalize="words" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" error={fieldError("city")}>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                  </Field>
                  <Field label="Phone" optional>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />
                  </Field>
                </div>
                <Field label="Address" optional hint="Where players drop off. Shown on your page.">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                </Field>

                <Field label="Labour price" hint="Per racket, before string. You can set a rush fee later.">
                  <UnitInput unit="USD" value={labour} onChange={(e) => setLabour(e.target.value.replace(/[^\d.]/g, ""))} />
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Usual turnaround</p>
                  <div className="flex flex-wrap gap-2">
                    {TURNAROUNDS.map((t) => (
                      <Chip key={t.hours} selected={turnaround === t.hours} onClick={() => setTurnaround(t.hours)} className="min-h-11">
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Certifications" optional>
                    <Input value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="USRSA MRT" />
                  </Field>
                  <Field label="Machine" optional>
                    <Input value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="Babolat Sensor" />
                  </Field>
                </div>

                {error && !(error instanceof ApiError && error.field) && (
                  <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand" role="alert">
                    {error.message}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" loading={create.isPending} disabled={name.trim().length < 2}>
                  Open my shop <ArrowRight />
                </Button>
                <p className="text-center text-xs text-muted">Free plan. No card needed. You can change all of this later.</p>
              </form>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
