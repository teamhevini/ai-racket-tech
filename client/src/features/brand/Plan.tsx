import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { BRAND_PLANS } from "@shared/tiers";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { useRefreshMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { brandMeKey, errMsg, Note, type BrandJson, type BrandPlanId } from "./shared";

/** Starts Stripe checkout for a brand plan. Shows the server's message (e.g. payments not configured on preview). */
export function useBrandCheckout() {
  return useMutation({
    mutationFn: (plan: "insights" | "partner") => api<{ url: string | null }>("POST", `/api/brand/checkout/${plan}`),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
      else toast.error("Checkout couldn't start. Please try again.");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

/** Confirms a returning Stripe session (?session_id=…) once. */
export function useVerifyCheckout(sessionId: string | null) {
  const refreshMe = useRefreshMe();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!sessionId || done.current) return;
    done.current = true;
    api<{ brand: BrandJson }>("POST", "/api/brand/checkout/verify", { session_id: sessionId })
      .then(({ brand }) => {
        toast.success(`You're on ${BRAND_PLANS[brand.plan].name}. Welcome aboard.`);
        qc.invalidateQueries({ queryKey: brandMeKey });
        return refreshMe();
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => navigate("/brand?tab=plan", { replace: true }));
  }, [sessionId, navigate, qc, refreshMe]);
}

const RANK: Record<BrandPlanId, number> = { free: 0, insights: 1, partner: 2 };

export function PlanTab({ brand }: { brand: BrandJson }) {
  const checkout = useBrandCheckout();
  const ids: BrandPlanId[] = brand.kind === "string" ? ["free", "insights", "partner"] : brand.kind === "racket" ? ["free", "insights"] : ["free"];

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="display text-4xl leading-tight">Plans</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
          {brand.kind === "retailer"
            ? "Retail listings are free. Players see every in-stock offer for a string, cheapest first, and your commission rate never changes that order."
            : "Every plan keeps the same rules for players: the AI's pick is never for sale, and sponsored placements only reach players your string genuinely fits."}
        </p>
      </div>

      <div className={cn("grid gap-4", ids.length === 3 ? "lg:grid-cols-3" : ids.length === 2 ? "md:grid-cols-2" : "max-w-md")}>
        {ids.map((id) => {
          const p = BRAND_PLANS[id];
          const current = brand.plan === id;
          const featured = id === "insights";
          const lower = RANK[id] < RANK[brand.plan];
          return (
            <Card
              key={id}
              className={cn("relative flex flex-col p-6 sm:p-7", featured && !current && "ring-2 ring-ink", current && "ring-2 ring-grass")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">{p.name}</p>
                {current ? <Badge tone="grass">Current plan</Badge> : featured ? <Badge tone="ball">Most popular</Badge> : null}
              </div>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="display text-5xl leading-none tabular">{p.price}</span>
                <span className="text-sm text-muted">{p.cadence}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug">
                    <Check className="mt-0.5 size-4 shrink-0 text-grass" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {current ? (
                  <Button variant="outline" className="w-full" disabled>
                    Your plan
                  </Button>
                ) : id === "free" || lower ? (
                  <p className="text-center text-xs text-muted">
                    To change down, email{" "}
                    <a href="mailto:partners@10is.app" className="underline underline-offset-2">
                      partners@10is.app
                    </a>
                  </p>
                ) : (
                  <Button
                    className="w-full"
                    variant={featured ? "primary" : "ink"}
                    loading={checkout.isPending && checkout.variables === id}
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate(id as "insights" | "partner")}
                  >
                    <Sparkles /> Upgrade to {p.name}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Note>Billed monthly through Stripe. Cancel any time; your listing and catalogue stay live on the free plan.</Note>
    </div>
  );
}
