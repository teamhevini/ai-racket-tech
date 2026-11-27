import * as React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BadgeCheck, BarChart3, Clock } from "lucide-react";
import { BRAND_PLANS } from "@shared/tiers";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { CatalogueTab } from "@/features/brand/Catalogue";
import { OffersTab } from "@/features/brand/Offers";
import { OverviewTab } from "@/features/brand/Overview";
import { PlanTab, useVerifyCheckout } from "@/features/brand/Plan";
import { SamplesTab } from "@/features/brand/Samples";
import { SponsoredTab } from "@/features/brand/Sponsored";
import { AccentDot, brandMeKey, errMsg, KIND_LABEL, PillTabs, type BrandJson, type BrandMeResponse } from "@/features/brand/shared";

type TabId = "overview" | "catalogue" | "sponsored" | "samples" | "offers" | "plan";

const TABS: Record<BrandJson["kind"], ReadonlyArray<{ id: TabId; label: string }>> = {
  string: [
    { id: "overview", label: "Overview" },
    { id: "catalogue", label: "Catalogue" },
    { id: "sponsored", label: "Sponsored" },
    { id: "samples", label: "Samples" },
    { id: "plan", label: "Plan" },
  ],
  racket: [
    { id: "overview", label: "Overview" },
    { id: "plan", label: "Plan" },
  ],
  retailer: [
    { id: "offers", label: "Offers" },
    { id: "overview", label: "Overview" },
    { id: "plan", label: "Plan" },
  ],
};

export default function BrandPortal() {
  const { signedIn, loading } = useMe();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const q = useQuery<BrandMeResponse>({ queryKey: brandMeKey, enabled: signedIn });
  useVerifyCheckout(signedIn ? sessionId : null);

  React.useEffect(() => {
    if (!loading && !signedIn) navigate("/login?next=/brand", { replace: true });
  }, [loading, signedIn, navigate]);

  if (loading || !signedIn || q.isLoading) {
    return (
      <Page>
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="mb-8 h-12 w-2/3 max-w-md" />
        <div className="mb-8 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </Page>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState title="Couldn't load your brand" body={errMsg(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
      </Page>
    );
  }

  const brand = q.data.brand;
  if (!brand) {
    return (
      <Page narrow>
        <EmptyState
          className="mt-6"
          icon={<BarChart3 />}
          title="10IS for Business"
          body="String companies, racket brands and retailers: manage your catalogue, reach players your products genuinely fit, and see honest, aggregated demand."
          action={
            <Button asChild size="lg">
              <Link href="/brand/new">Set up your brand</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const tabs = TABS[brand.kind];
  const raw = params.get("tab") as TabId | null;
  const tab: TabId = tabs.some((t) => t.id === raw) ? (raw as TabId) : tabs[0].id;
  const setTab = (id: TabId) => navigate(`/brand?tab=${id}`, { replace: true });
  const strings = q.data.strings ?? [];

  return (
    <Page>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <AccentDot color={brand.accent} />
            {KIND_LABEL[brand.kind]}
          </p>
          <h1 className="display text-[2.75rem] leading-[1.02] sm:text-6xl">{brand.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={brand.plan === "free" ? "neutral" : "ball"}>{BRAND_PLANS[brand.plan].name}</Badge>
            {brand.claimed ? (
              <Badge tone="grass">
                <BadgeCheck className="size-3.5" /> Verified
              </Badge>
            ) : (
              <Badge tone="clay" title="We'll confirm you represent the company. Email partners@10is.app to speed it up.">
                <Clock className="size-3.5" /> Unverified
              </Badge>
            )}
            {brand.tagline && <span className="hidden text-sm text-muted sm:inline">{brand.tagline}</span>}
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/brands/${brand.slug}`}>
            Public page <ArrowUpRight />
          </Link>
        </Button>
      </header>

      <PillTabs tabs={tabs} value={tab} onChange={setTab} label="Brand portal sections" />

      <div role="tabpanel" className="animate-fade-up" key={tab}>
        {tab === "overview" && <OverviewTab brand={brand} />}
        {tab === "catalogue" && <CatalogueTab strings={strings} />}
        {tab === "sponsored" && <SponsoredTab brand={brand} strings={strings} />}
        {tab === "samples" && <SamplesTab strings={strings} />}
        {tab === "offers" && <OffersTab brand={brand} />}
        {tab === "plan" && <PlanTab brand={brand} />}
      </div>
    </Page>
  );
}
