import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useParams } from "wouter";
import { Store } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { Billing } from "@/features/shop/Billing";
import { Customers } from "@/features/shop/Customers";
import { Insights } from "@/features/shop/Insights";
import { Queue } from "@/features/shop/Queue";
import { Settings } from "@/features/shop/Settings";
import type { ShopMe } from "@/features/shop/types";

const TABS = [
  { key: "queue", href: "/shop", label: "Queue", eyebrow: "Today", title: "The queue" },
  { key: "customers", href: "/shop/customers", label: "Customers", eyebrow: "Regulars", title: "Customers" },
  { key: "insights", href: "/shop/insights", label: "Insights", eyebrow: "How it's going", title: "Insights" },
  { key: "settings", href: "/shop/settings", label: "Settings", eyebrow: "Your shop", title: "Settings" },
  { key: "billing", href: "/shop/billing", label: "Billing", eyebrow: "Plan", title: "Billing" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ShopConsole() {
  const params = useParams<{ tab?: string }>();
  const tabKey = (params.tab ?? "queue") as TabKey;
  const tab = TABS.find((t) => t.key === tabKey);
  const { me, signedIn, loading } = useMe();
  const q = useQuery<ShopMe>({ queryKey: ["/api/shop/me"], enabled: signedIn && !!me.shop });

  if (!loading && !signedIn) return <Redirect to={`/login?next=${encodeURIComponent(window.location.pathname)}`} />;
  if (!tab || params.tab === "queue") return <Redirect to="/shop" />;

  if (loading || (me.shop && q.isLoading)) {
    return (
      <Page>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-12 w-64" />
        <div className="mt-8 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 rounded-2xl" />
      </Page>
    );
  }

  const shop = q.data?.shop;
  if (!me.shop || (q.isSuccess && !shop)) {
    return (
      <Page narrow>
        <EmptyState
          className="mt-6"
          icon={<Store />}
          title="Run your stringing on 10IS"
          body="A public booking page, a job queue built for one hand behind the machine, and every customer's racket history in one place. Free to start."
          action={
            <Button asChild size="lg">
              <Link href="/shop/new">Open your shop</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  if (q.isError || !shop || !q.data) {
    return (
      <Page>
        <EmptyState title="Couldn't load your shop" body={(q.error as Error | null)?.message ?? "Please try again."} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
      </Page>
    );
  }

  const pro = shop.plan === "pro";
  const counts = q.data.counts;

  return (
    <Page>
      <header className="mb-5 sm:mb-7">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">{shop.name}</p>
          {pro ? <Badge tone="ball">Shop Pro</Badge> : <Badge>Shop</Badge>}
          {!shop.acceptingBookings && (
            <Link href="/shop/settings">
              <Badge tone="clay">Bookings paused</Badge>
            </Link>
          )}
        </div>
        <h1 className="display mt-2 text-[2.5rem] leading-[1.02] sm:text-5xl">{tab.title}</h1>
      </header>

      <nav aria-label="Shop sections" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = t.key === tabKey;
            const badge = t.key === "queue" && counts?.requested ? counts.requested : null;
            return (
              <li key={t.key}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-200 ease-spring active:scale-[0.97]",
                    active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink/30",
                  )}
                >
                  {t.label}
                  {badge != null && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-2xs font-bold leading-5 text-brand-ink">{badge}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* No transform on the queue wrapper: it would trap the fixed walk-in button. */}
      <div key={tabKey} className={tabKey === "queue" ? undefined : "animate-fade-up"}>
        {tabKey === "queue" && <Queue />}
        {tabKey === "customers" && <Customers />}
        {tabKey === "insights" && <Insights />}
        {tabKey === "settings" && <Settings key={shop.id} shop={shop} />}
        {tabKey === "billing" && <Billing data={q.data} />}
      </div>
    </Page>
  );
}
