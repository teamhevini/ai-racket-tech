import * as React from "react";
import { Link, useLocation } from "wouter";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { PLANS, LIFETIME, planPrice, FREE_RACKET_LIMIT, FREE_HISTORY_LIMIT, FREE_STRINGER_RESULTS, type BillingInterval } from "@shared/tiers";
import { Segmented } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type PlanId = "free" | "pro" | "club";

const FREE_FEATURES = [
  `Up to ${FREE_RACKET_LIMIT} rackets in your bag`,
  "Restring reminders & calendar export",
  "AI string recommendations",
  `Latest ${FREE_HISTORY_LIMIT} restrings per racket`,
  `Top ${FREE_STRINGER_RESULTS} stringers near you`,
];

export default function Pricing() {
  const { me, signedIn } = useMe();
  const [, navigate] = useLocation();
  const [loading, setLoading] = React.useState<PlanId | "lifetime" | null>(null);
  const [interval, setInterval] = React.useState<BillingInterval>("year");
  const tier = signedIn ? me.tier : null;

  async function checkout(plan: "pro" | "club" | "lifetime") {
    if (!signedIn) return navigate(`/signup?next=${encodeURIComponent("/pricing")}`);
    setLoading(plan);
    try {
      const { url } = await api<{ url: string }>("POST", `/api/checkout/${plan}${plan === "lifetime" ? "" : `?interval=${interval}`}`);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
      setLoading(null);
    }
  }

  const plans: Array<{ id: PlanId; name: string; price: string; cadence: string; features: readonly string[]; pitch: string }> = [
    { id: "free", name: "Free", price: "$0", cadence: "forever", features: FREE_FEATURES, pitch: "Everything you need to keep one or two frames fresh." },
    { id: "pro", ...PLANS.pro, price: planPrice("pro", interval).label, cadence: planPrice("pro", interval).cadence, pitch: interval === "year" ? "About $4 a month. Your whole bag, its full history, no ads." : "Your whole bag, its full history, no ads." },
    { id: "club", ...PLANS.club, price: planPrice("club", interval).label, cadence: planPrice("club", interval).cadence, pitch: "Pro plus a technician in your pocket." },
  ];

  const isCurrent = (id: PlanId) => tier === id;
  const covered = (id: PlanId) => tier === "club" ? id !== "club" : tier === "pro" ? id === "free" : false;

  return (
    <Page>
      <PageHeader
        eyebrow="Pricing"
        title={<>Simple plans, <em className="italic text-brand">no tiebreaks.</em></>}
        description="Start free. Upgrade when your bag grows — every plan keeps your reminders running."
      />
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Segmented
          label="Billing"
          value={interval}
          onChange={setInterval}
          options={[
            { value: "year", label: "Yearly" },
            { value: "month", label: "Monthly" },
          ]}
        />
        <span className="rounded-full bg-grass-soft px-3 py-1 text-xs font-semibold text-grass">Yearly saves up to 42%</span>
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const featured = p.id === "pro";
          return (
            <Card
              key={p.id}
              className={cn(
                "relative flex flex-col p-6",
                featured && "bg-ink text-bg ring-ink md:-my-3 md:py-9",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                {isCurrent(p.id) ? (
                  <Badge tone="grass">Your plan</Badge>
                ) : featured ? (
                  <Badge tone="ball">Most popular</Badge>
                ) : null}
              </div>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="display text-6xl">{p.price}</span>
                <span className={cn("text-sm", featured ? "text-bg/60" : "text-muted")}>{p.cadence}</span>
              </p>
              <p className={cn("mt-2 text-sm", featured ? "text-bg/70" : "text-muted")}>{p.pitch}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm">
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-ball" : "text-grass")} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {p.id === "free" ? (
                  signedIn ? (
                    <Button asChild variant="outline" className={cn("w-full", featured && "border-bg/30 text-bg")}>
                      <Link href="/bag">{isCurrent("free") ? "Go to my bag" : "Included"}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/signup">Join free</Link>
                    </Button>
                  )
                ) : isCurrent(p.id) || covered(p.id) ? (
                  <Button disabled variant={featured ? "ball" : "secondary"} className="w-full">
                    {isCurrent(p.id) ? "Current plan" : "Included in your plan"}
                  </Button>
                ) : (
                  <Button
                    variant={featured ? "ball" : "primary"}
                    className="w-full"
                    size="lg"
                    loading={loading === p.id}
                    onClick={() => checkout(p.id as "pro" | "club")}
                  >
                    {signedIn ? `Get ${p.name}` : `Sign up for ${p.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {tier !== "pro" && tier !== "club" && (
        <Card className="mt-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">{LIFETIME.name} · {LIFETIME.price} once</p>
            <p className="mt-1 text-sm text-muted">Founder pricing: everything in Pro, for good. Available while we're early.</p>
          </div>
          <Button variant="outline" loading={loading === "lifetime"} onClick={() => checkout("lifetime")}>
            Get lifetime
          </Button>
        </Card>
      )}
      <p className="mt-10 text-center text-sm text-muted">
        Secure checkout by Stripe. Cancel any time from your account; you keep access until the period ends. Bought Pro before? It's yours for good.
      </p>
    </Page>
  );
}
