import * as React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock, MapPin, Search, Store, Wrench } from "lucide-react";
import { Page } from "@/components/Layout";
import { Input } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/surface";
import { useMe } from "@/hooks/use-me";
import { useDebounce } from "@/hooks/use-debounce";
import { DemoBadge, RatingInline, VerifiedShopBadge } from "@/features/market/bits";
import { ACTIVE_STATUSES, cents, prefillFromSearch, bookingQuery, turnaroundLabel, type MarketShop, type PlayerBooking } from "@/features/market/types";

export default function Shops() {
  const { signedIn } = useMe();
  const [q, setQ] = React.useState("");
  const dq = useDebounce(q.trim(), 250);
  const shops = useQuery<MarketShop[]>({ queryKey: [`/api/shops${dq ? `?q=${encodeURIComponent(dq)}` : ""}`] });
  const bookings = useQuery<PlayerBooking[]>({ queryKey: ["/api/bookings"], enabled: signedIn });

  // Carry a pending booking (from a reminder, setup or string page) through to the shop page.
  const carry = React.useMemo(() => {
    const p = prefillFromSearch(window.location.search);
    return p ? `?${bookingQuery(p)}` : "";
  }, []);
  const carrying = carry.length > 0;

  const mine = bookings.data ?? [];
  const active = mine.filter((b) => ACTIVE_STATUSES.includes(b.status));

  return (
    <Page>
      <PageHeader
        eyebrow="Stringers"
        title={
          <>
            Book a <em className="text-brand">10IS stringer</em>
          </>
        }
        description={
          carrying
            ? "Pick a shop and your racket, strings and tension come with you."
            : "Shops that take bookings through 10IS — live status, your racket's history, no phone tag."
        }
      />

      {mine.length > 0 && (
        <Link href="/bookings" className="group mb-6 block">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink px-5 py-4 text-bg transition-transform duration-300 ease-spring group-active:scale-[0.99]">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ball">Your restrings</p>
              <p className="mt-0.5 truncate font-medium">
                {active.length ? `${active.length} in progress · ${active[0].shop.name}` : `${mine.length} past booking${mine.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input className="pl-11" placeholder="Search by shop, city or street" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search shops" type="search" />
      </div>
      <p className="mb-6 text-xs text-muted">
        Listed A–Z. Shops can't pay to rank higher.{" "}
        <Link href="/how-we-rank" className="underline underline-offset-2">
          How we rank
        </Link>
      </p>

      {shops.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : shops.isError ? (
        <EmptyState title="Couldn't load shops" body={(shops.error as Error).message} />
      ) : (shops.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Store />}
          title={dq ? `No 10IS shops match "${dq}"` : "No shops yet"}
          body="Try a nearby city, or search every stringer near you below."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shops.data!.map((s, i) => (
            <li key={s.id} className="min-w-0 animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <ShopCard shop={s} href={`/shops/${s.slug}${carry}`} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/stringers" className="group mt-10 block">
        <Card className="flex items-center gap-4 p-5 transition-all duration-300 ease-spring group-hover:shadow-lift">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Search all stringers near you</p>
            <p className="text-sm text-muted">Every shop and club on the map, including ones not on 10IS yet.</p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Card>
      </Link>

      <p className="mt-8 text-center text-sm text-muted">
        String rackets for a living?{" "}
        <Link href="/business" className="font-medium text-ink underline underline-offset-4">
          Open your shop on 10IS
        </Link>
      </p>
    </Page>
  );
}

function ShopCard({ shop, href }: { shop: MarketShop; href: string }) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col p-5 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="display text-2xl leading-tight">{shop.name}</h2>
            <p className="mt-0.5 truncate text-sm text-muted">{[shop.city, shop.tagline].filter(Boolean).join(" · ") || "Stringing shop"}</p>
          </div>
          <RatingInline rating={shop.rating} className="shrink-0" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shop.pro && <VerifiedShopBadge />}
          {shop.acceptingBookings ? <Badge tone="grass">Taking bookings</Badge> : <Badge>Not taking bookings</Badge>}
          {shop.isDemo && <DemoBadge />}
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm [&_dt]:flex [&_dt]:items-center [&_dt]:gap-1 [&_dt]:text-xs [&_dt]:text-muted">
          <div>
            <dt>
              <Wrench className="size-3" /> From
            </dt>
            <dd className="mt-0.5 font-mono font-semibold tabular">{cents(shop.labourCents)}</dd>
          </div>
          <div>
            <dt>
              <Clock className="size-3" /> Turnaround
            </dt>
            <dd className="mt-0.5 font-semibold">{turnaroundLabel(shop.turnaroundHours)}</dd>
          </div>
          <div>
            <dt>
              <CheckCircle2 className="size-3" /> Restrings
            </dt>
            <dd className="mt-0.5 font-mono font-semibold tabular">{shop.rating?.jobs ?? 0}</dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
