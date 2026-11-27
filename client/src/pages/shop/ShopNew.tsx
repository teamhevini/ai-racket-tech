import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Redirect, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ArrowRight, CalendarCheck, ClipboardList, History, Store, UserRoundCheck } from "lucide-react";
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

interface InviteInfo {
  inviterFirstName: string;
  stringerName: string;
  city: string | null;
  accepted: boolean;
}

export default function ShopNew() {
  const { me, signedIn, loading } = useMe();
  const refreshMe = useRefreshMe();
  const [, navigate] = useLocation();
  const inviteCode = new URLSearchParams(useSearch()).get("invite")?.slice(0, 40) || null;
  const invite = useQuery<InviteInfo>({ queryKey: [`/api/invites/${inviteCode}`], enabled: !!inviteCode, staleTime: Infinity });
  const validInvite = invite.data && !invite.data.accepted ? invite.data : null;
  const back = inviteCode ? `/shop/new?invite=${encodeURIComponent(inviteCode)}` : "/shop/new";
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  // Prefill from the customer's invite (they saved this stringer by name), once.
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (!validInvite || prefilled.current) return;
    prefilled.current = true;
    setName((n) => n || validInvite.stringerName);
    setCity((c) => c || validInvite.city || "");
  }, [validInvite]);
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
        inviteCode: validInvite ? inviteCode ?? undefined : undefined,
      });
    },
    onSuccess: async () => {
      await refreshMe();
      toast.success(`${name.trim()} is open`, {
        description: validInvite
          ? `${validInvite.inviterFirstName} can now book you straight from their reminder.`
          : "Add your first walk-in or share your page to start taking bookings.",
      });
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

  if (me.shop && validInvite) return <LinkExistingShop code={inviteCode!} invite={validInvite} shopName={me.shop.name} />;
  if (me.shop) return <Redirect to="/shop" />;

  const fieldError = (f: string) => (error instanceof ApiError && error.field === f ? error.message : null);

  return (
    <Page>
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
        <section className="animate-fade-up lg:pt-6">
          {validInvite && (
            <div className="mb-6 flex max-w-lg items-start gap-3 rounded-2xl bg-grass-soft px-4 py-3.5 text-grass">
              <UserRoundCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">{validInvite.inviterFirstName} invited you.</span> They already track their rackets in 10IS. Open your
                shop (it's free) and their next restring can be booked with you in two taps, with live status so they know when it's ready.
              </p>
            </div>
          )}
          {invite.data?.accepted && (
            <p className="mb-6 max-w-lg rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">This invite has already been used, but you can still open your own shop below.</p>
          )}
          {invite.isError && (
            <p className="mb-6 max-w-lg rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">That invite link isn't valid any more, but you can still open your shop below.</p>
          )}
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
                  <Link href={`/signup?next=${encodeURIComponent(back)}`}>
                    Create a free account <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href={`/login?next=${encodeURIComponent(back)}`}>I already have an account</Link>
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

/** Already on 10IS: one tap links the inviting customer to this shop. */
function LinkExistingShop({ code, invite, shopName }: { code: string; invite: InviteInfo; shopName: string }) {
  const [, navigate] = useLocation();
  const link = useMutation({
    mutationFn: () => api("POST", `/api/shop/invites/${encodeURIComponent(code)}/accept`),
    onSuccess: () => {
      toast.success(`Linked with ${invite.inviterFirstName}`, { description: "Their next restring can be booked with you in two taps." });
      navigate("/shop");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't link. Try again."),
  });
  return (
    <Page narrow>
      <Card className="mt-6 p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-grass-soft text-grass">
          <UserRoundCheck className="size-5" />
        </span>
        <h1 className="display mt-5 text-4xl leading-tight">{invite.inviterFirstName} invited you</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          You're already on 10IS as <span className="font-semibold text-ink">{shopName}</span>. Link {invite.inviterFirstName} to your shop and their reminder
          will book you directly.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" loading={link.isPending} onClick={() => link.mutate()}>
            Link {invite.inviterFirstName} to {shopName}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/shop">Not now</Link>
          </Button>
        </div>
      </Card>
    </Page>
  );
}
