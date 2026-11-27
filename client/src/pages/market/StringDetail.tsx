import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarCheck, Gift, Star } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { SpecBar } from "@/features/market/bits";
import { AffiliateDisclosure, OfferList } from "@/features/market/Offers";
import { bookingQuery, cents, type StringDetailResponse } from "@/features/market/types";

const SPECS = [
  ["comfort", "Comfort"],
  ["spin", "Spin"],
  ["control", "Control"],
  ["power", "Power"],
  ["durability", "Durability"],
] as const;

export default function StringDetail() {
  const { id } = useParams<{ id: string }>();
  const ref = new URLSearchParams(window.location.search).get("ref");
  const q = useQuery<StringDetailResponse>({ queryKey: [`/api/strings/${id}`] });

  if (q.isLoading) {
    return (
      <Page narrow>
        <Skeleton className="mb-6 h-6 w-24" />
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="mt-4 h-48 rounded-2xl" />
      </Page>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState
          title="String not found"
          body="It may have been removed from the catalogue."
          action={
            <Button asChild variant="secondary">
              <Link href="/setup">Get a string setup</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const s = q.data;
  const accent = s.brand?.accent ?? null;
  const specs = SPECS.filter(([k]) => s[k] != null);
  const bookHref = `/shops?${bookingQuery({ stringId: s.id, affiliateCode: ref })}`;

  return (
    <Page narrow className="pb-16">
      <Button variant="ghost" size="sm" className="-ml-3 mb-4" onClick={() => history.back()}>
        <ArrowLeft /> Back
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-surface p-6 shadow-card ring-1 ring-line/70 sm:p-8">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent ?? "rgb(var(--brand))" }} />
        <div className="flex flex-wrap items-center gap-2">
          {s.brand ? (
            <Link href={`/brands/${s.brand.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
              {s.brand.name}
              {s.brand.verified && <BadgeCheck className="size-4 text-grass" aria-label="Verified brand" />}
            </Link>
          ) : (
            <span className="text-sm font-semibold">{s.brandName}</span>
          )}
          <Badge className="capitalize">{s.family}</Badge>
        </div>
        <h1 className="display mt-3 text-[2.75rem] leading-[0.98] sm:text-6xl">{s.model}</h1>
        {s.description && <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{s.description}</p>}

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
          <div>
            <dt className="text-xs text-muted">Gauges</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular">{s.gauges ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Stiffness</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular">{s.stiffness ? `${s.stiffness} lb/in` : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Set price</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular">{cents(s.setPriceCents)}</dd>
          </div>
        </dl>

        {s.rating && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-surface-2/60 px-4 py-3 text-sm">
            <Star className="size-4 fill-current text-clay" aria-hidden />
            <span className="font-semibold tabular">{s.rating.avg.toFixed(1)}</span>
            <span className="text-muted">from {s.rating.players} players who booked it through 10IS</span>
          </div>
        )}

        <Button asChild size="lg" className="mt-6 w-full">
          <Link href={bookHref}>
            <CalendarCheck /> Book it strung
          </Link>
        </Button>
      </section>

      <section className="mt-8" aria-labelledby="specs">
        <h2 id="specs" className="eyebrow mb-3">
          Playing profile
        </h2>
        <Card className="p-5">
          {specs.length ? (
            <div className="space-y-4">
              {specs.map(([k, label]) => (
                <SpecBar key={k} label={label} value={s[k]!} accent={accent} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Specs pending review.</p>
          )}
          <p className="mt-4 text-2xs text-faint">Editorial scores out of 10, reviewed by 10IS. Brands can suggest specs but can't publish them unreviewed.</p>
        </Card>
      </section>

      {s.sampleShops.length > 0 && (
        <section className="mt-8" aria-labelledby="samples">
          <h2 id="samples" className="eyebrow mb-3">
            Free sample at
          </h2>
          <ul className="space-y-2">
            {s.sampleShops.map((p) => (
              <li key={`${p.programId}-${p.shopSlug}`}>
                <Link href={`/shops/${p.shopSlug}`} className="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-card ring-1 ring-line/70">
                  <Gift className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.shopName}</span>
                    <span className="block truncate text-xs text-muted">
                      {p.title}
                      {p.city ? ` · ${p.city}` : ""} · brand-funded sample
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="buy">
        <h2 id="buy" className="eyebrow mb-3">
          Buy a set
        </h2>
        <Card className="px-5 py-2">
          <OfferList offers={s.offers} src="string-page" />
        </Card>
        {s.offers.length > 0 && <AffiliateDisclosure className="mt-3" />}
      </section>
    </Page>
  );
}
