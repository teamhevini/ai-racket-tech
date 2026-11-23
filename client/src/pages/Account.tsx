import * as React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Bell, CalendarPlus, ChevronRight, Download, LogOut, Moon, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { ConfirmSheet } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { HistoryRun, Me, Profile } from "@/lib/types";
import { useMe, useRefreshMe } from "@/hooks/use-me";
import { useTheme } from "@/hooks/use-theme";
import { formatDate, formatMonth } from "@/lib/format";
import { PLANS, FREE_RACKET_LIMIT } from "@shared/tiers";
import { SUPPORT_EMAIL } from "@shared/contact";
import { PasswordInput } from "./Login";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan & billing" },
  { id: "notifications", label: "Reminders" },
  { id: "history", label: "Setup history" },
  { id: "password", label: "Password" },
  { id: "data", label: "Your data" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const profileKey = ["/api/account/profile"];
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function Section({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: Profile }) {
  const refreshMe = useRefreshMe();
  const [v, setV] = React.useState({ firstName: profile.firstName ?? "", lastName: profile.lastName ?? "", email: profile.email ?? "" });
  const save = useMutation({
    mutationFn: () => api<Me>("PATCH", "/api/account/profile", v),
    onSuccess: async (me) => {
      toast.success("Profile saved");
      await refreshMe(me);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Section title="Your details" description={`Member since ${formatMonth(profile.createdAt)}.`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input autoComplete="given-name" value={v.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Last name">
            <Input autoComplete="family-name" value={v.lastName} onChange={set("lastName")} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" inputMode="email" autoComplete="email" value={v.email} onChange={set("email")} />
        </Field>
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </form>
    </Section>
  );
}

// ─── Password ───────────────────────────────────────────────────────────────

function PasswordTab({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api("POST", "/api/account/change-password", { currentPassword: cur, newPassword: next }),
    onSuccess: () => {
      toast.success(profile.hasPassword ? "Password updated" : "Password set — you can now log in anywhere");
      setCur("");
      setNext("");
      setConfirm("");
      qc.invalidateQueries({ queryKey: profileKey });
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Section
      title={profile.hasPassword ? "Change password" : "Set a password"}
      description={profile.hasPassword ? undefined : "Your account was created at checkout and doesn't have a password yet. Set one so you can log in on any device."}
    >
      <form
        className="max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (next.length < 8) return setError("Use at least 8 characters.");
          if (next !== confirm) return setError("The new passwords don't match.");
          save.mutate();
        }}
      >
        {profile.hasPassword && (
          <Field label="Current password">
            <PasswordInput autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
          </Field>
        )}
        <Field label="New password" hint="At least 8 characters.">
          <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-brand" role="alert">{error}</p>}
        <Button type="submit" loading={save.isPending}>
          {profile.hasPassword ? "Update password" : "Set password"}
        </Button>
      </form>
    </Section>
  );
}

// ─── Plan & billing ─────────────────────────────────────────────────────────

function PlanTab({ profile }: { profile: Profile }) {
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [cancelAt, setCancelAt] = React.useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: () => api<{ cancelAt: string | null }>("POST", "/api/account/cancel-subscription"),
    onSuccess: (r) => {
      setCancelAt(r.cancelAt);
      setConfirmCancel(false);
      toast.success("Subscription cancelled", { description: "You keep Club until the end of this billing period." });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const portal = useMutation({
    mutationFn: () => api<{ url: string }>("POST", "/api/account/billing-portal"),
    onSuccess: (r) => (window.location.href = r.url),
    onError: (e) => toast.error(errMsg(e)),
  });

  const tier = profile.tier;
  const paid = tier !== "free";
  const plan = paid ? PLANS[tier as "pro" | "club"] : null;

  return (
    <div className="space-y-4">
      <Card className={cn("overflow-hidden p-6", paid && "bg-ink text-bg ring-ink")}>
        <div className="flex items-center justify-between">
          <p className={cn("eyebrow", paid && "text-bg/60")}>Current plan</p>
          {profile.isAdmin && <Badge tone="ball">Admin</Badge>}
        </div>
        <p className="display mt-2 text-5xl">{plan ? plan.name : "Free"}</p>
        <p className={cn("mt-1 text-sm", paid ? "text-bg/70" : "text-muted")}>
          {plan ? `${plan.price} ${plan.cadence}` : `Up to ${FREE_RACKET_LIMIT} rackets, reminders included.`}
        </p>
        {plan && (
          <ul className="mt-5 space-y-1.5 text-sm text-bg/80">
            {plan.features.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {tier !== "club" && (
            <Button asChild variant={paid ? "ball" : "primary"}>
              <Link href="/pricing">
                <Sparkles /> {tier === "pro" ? "Add Club" : "Upgrade"}
              </Link>
            </Button>
          )}
          {profile.hasSubscription && (
            <Button variant={paid ? "outline" : "secondary"} className={cn(paid && "border-bg/30 text-bg hover:bg-bg/10")} loading={portal.isPending} onClick={() => portal.mutate()}>
              Manage billing <ArrowUpRight />
            </Button>
          )}
        </div>
      </Card>

      {tier === "club" && profile.hasSubscription && (
        <Section title="Cancel Club" description="You'll keep Club features until the end of the period you've paid for.">
          {cancelAt ? (
            <p className="text-sm">
              Club stays active until <strong>{formatDate(cancelAt)}</strong>.
            </p>
          ) : (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancel subscription
            </Button>
          )}
        </Section>
      )}

      <ConfirmSheet
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel Club?"
        body="Your subscription won't renew. Live AI chat ends when the current period does; your rackets, history and reminders stay."
        confirmLabel="Cancel subscription"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  );
}

// ─── Reminders ──────────────────────────────────────────────────────────────

function NotificationsTab({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (reminderEnabled: boolean) => api("PATCH", "/api/account/notifications", { reminderEnabled }),
    onMutate: (v) => qc.setQueryData<Profile>(profileKey, (p) => (p ? { ...p, reminderEnabled: v } : p)),
    onSuccess: (_d, v) => toast.success(v ? "Reminder emails on" : "Reminder emails off"),
    onError: (e) => {
      toast.error(errMsg(e));
      qc.invalidateQueries({ queryKey: profileKey });
    },
  });

  return (
    <div className="space-y-4">
      <Section title="Restring reminders" description="Every racket in your bag has its own schedule, based on how much you play and what you strung it with.">
        <Switch
          checked={profile.reminderEnabled}
          onCheckedChange={(v) => toggle.mutate(v)}
          label="Email me when strings are due"
          description={`Sent to ${profile.email}. One email per set of strings — never spam.`}
        />
      </Section>
      <Card className="divide-y divide-line">
        {[
          { icon: <Bell />, title: "In-app reminders", body: "Due rackets show on your home screen and in My bag." },
          { icon: <CalendarPlus />, title: "Add to your calendar", body: "Open a racket and tap “Add to calendar” for a reminder on the exact day." },
        ].map((r) => (
          <div key={r.title} className="flex gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-grass-soft text-grass [&_svg]:size-4">{r.icon}</span>
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-muted">{r.body}</p>
            </div>
          </div>
        ))}
        <Link href="/bag" className="flex items-center justify-between p-5 text-sm font-medium hover:bg-surface-2/50">
          Adjust schedules in My bag <ChevronRight className="size-4 text-muted" />
        </Link>
      </Card>
    </div>
  );
}

// ─── Setup history ──────────────────────────────────────────────────────────

function HistoryTab() {
  const qc = useQueryClient();
  const runs = useQuery<HistoryRun[]>({ queryKey: ["/api/account/recommendations"] });
  const del = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/account/recommendations/${id}`),
    onSuccess: () => {
      toast.success("Removed from history");
      qc.invalidateQueries({ queryKey: ["/api/account/recommendations"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (runs.isLoading) return <Skeleton className="h-48" />;
  if (runs.isError) return <p className="text-sm text-brand">{errMsg(runs.error)}</p>;
  if (!runs.data?.length) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="No setups yet"
        body="Every string recommendation you run is saved here."
        action={<Button asChild><Link href="/setup">Get my setup</Link></Button>}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {runs.data.map((r) => {
        const mains = r.output?.setup?.mains;
        return (
          <li key={r.id}>
            <Card className="flex items-center gap-3 p-4">
              <Link href={`/recommendation/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{mains?.exampleStrings?.[0] ?? mains?.stringFamily ?? "Setup"}</p>
                <p className="truncate text-xs text-muted">
                  {mains?.tension && <span className="font-mono tabular text-ink">{mains.tension} lbs · </span>}
                  {r.racketLabel ?? "Racket not specified"} · {formatDate(r.createdAt)}
                </p>
              </Link>
              <Badge tone={r.confidence === "high" ? "grass" : r.confidence === "medium" ? "clay" : "neutral"} className="capitalize">{r.confidence}</Badge>
              <Button variant="ghost" size="icon-sm" aria-label="Remove from history" onClick={() => del.mutate(r.id)}>
                <Trash2 />
              </Button>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

function DataTab() {
  const [, navigate] = useLocation();
  const refreshMe = useRefreshMe();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const del = useMutation({
    mutationFn: () => api<{ exportData: unknown }>("DELETE", "/api/account/delete", { confirm: typed }),
    onSuccess: async ({ exportData }) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "10is-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your account has been deleted", { description: "A copy of your data was downloaded." });
      await refreshMe();
      navigate("/");
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-4">
      <Section title="Download your data" description="Rackets, full restring history, stringers and every setup — as JSON.">
        <Button asChild variant="secondary">
          <a href="/api/account/export" download="10is-export.json">
            <Download /> Download export
          </a>
        </Button>
      </Section>
      <Section title="Delete account" description="Permanently removes your account and everything in it. We'll download a copy for you first.">
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 /> Delete my account
        </Button>
      </Section>
      <ConfirmSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTyped("");
        }}
        title="Delete your account?"
        confirmLabel="Delete forever"
        loading={del.isPending}
        onConfirm={() => (typed === "DELETE" ? del.mutate() : toast.error('Type "DELETE" to confirm'))}
        body={
          <div className="space-y-4">
            <p>This can't be undone. Your rackets, restring history, stringers and subscription link will be erased.</p>
            <Field label='Type "DELETE" to confirm'>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
            </Field>
          </div>
        }
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Account() {
  const { me, signedIn, loading } = useMe();
  const [, navigate] = useLocation();
  const search = useSearch();
  const refreshMe = useRefreshMe();
  const { theme, toggle } = useTheme();
  const tabParam = new URLSearchParams(search).get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "profile";
  const profile = useQuery<Profile>({ queryKey: profileKey, enabled: signedIn });
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    if (!loading && !signedIn) navigate("/login?next=/account", { replace: true });
  }, [loading, signedIn, navigate]);

  // Keep the active tab visible (deep links like ?tab=history land on it). Scroll only the
  // tab strip horizontally so the page itself doesn't jump.
  const profileReady = !!profile.data;
  React.useEffect(() => {
    const el = tabRefs.current[tab];
    const strip = el?.parentElement;
    if (!el || !strip) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [tab, profileReady]);

  const setTab = (id: TabId) => navigate(`/account?tab=${id}`, { replace: true });

  async function signOut() {
    await api("POST", "/api/auth/logout").catch(() => undefined);
    await refreshMe();
    toast.success("Signed out");
    navigate("/");
  }

  if (loading || !signedIn || profile.isLoading) {
    return (
      <Page narrow>
        <Skeleton className="mb-6 h-12 w-2/3" />
        <Skeleton className="h-64" />
      </Page>
    );
  }
  if (!profile.data) {
    return (
      <Page narrow>
        <p className="text-brand">{errMsg(profile.error)}</p>
      </Page>
    );
  }
  const p = profile.data;

  return (
    <Page narrow>
      <header className="mb-6 flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-xl font-semibold text-bg">
          {(p.firstName?.[0] ?? p.email?.[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="display truncate text-4xl leading-none">{p.firstName ? `${p.firstName} ${p.lastName ?? ""}` : "Your account"}</h1>
          <p className="mt-1 flex items-center gap-2 truncate text-sm text-muted">
            {p.email} <Badge tone={p.tier === "free" ? "neutral" : "ball"}>{p.tier === "free" ? "Free" : PLANS[p.tier as "pro" | "club"].name}</Badge>
          </p>
        </div>
      </header>

      {/* Scrollable tabs — v1 used a fixed sidebar that left phones a sliver of content. */}
      <div role="tablist" aria-label="Account sections" className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-spring",
              tab === t.id ? "bg-ink text-bg" : "bg-surface text-muted ring-1 ring-line hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="animate-fade-up" key={tab}>
        {tab === "profile" && <ProfileTab profile={p} />}
        {tab === "password" && <PasswordTab profile={p} />}
        {tab === "plan" && <PlanTab profile={p} />}
        {tab === "notifications" && <NotificationsTab profile={p} />}
        {tab === "history" && <HistoryTab />}
        {tab === "data" && <DataTab />}
      </div>

      <Card className="mt-8 divide-y divide-line">
        {me.isAdmin && (
          <Link href="/admin" className="flex items-center gap-3 p-4 text-sm font-medium hover:bg-surface-2/50">
            <ShieldCheck className="size-4 text-muted" /> Admin dashboard <ChevronRight className="ml-auto size-4 text-muted" />
          </Link>
        )}
        <button onClick={toggle} className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium hover:bg-surface-2/50">
          {theme === "dark" ? <Sun className="size-4 text-muted" /> : <Moon className="size-4 text-muted" />}
          {theme === "dark" ? "Day mode" : "Night mode"}
          <span className="ml-auto text-xs text-muted">Day mode is easiest to read in sunlight</span>
        </button>
        <button onClick={signOut} className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium text-brand hover:bg-brand-soft/50">
          <LogOut className="size-4" /> Sign out
        </button>
      </Card>

      <nav aria-label="About 10IS" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <Link href="/about" className="hover:text-ink">About</Link>
        <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">Contact</a>
      </nav>
    </Page>
  );
}
