import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Gift, Globe, Info } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { DemoBadge, readableOn } from "@/features/market/bits";
import { cents, type BrandResponse } from "@/features/market/types";
import { cn } from "@/lib/utils";

const KIND: Record<BrandResponse["kind"], string> = { string: "String company", racket: "Racket brand", retailer: "Retailer" };

export default function BrandProfile() {
  const { slug } = useParams<{ slug: string }>();
  const q = useQuery<BrandResponse>({ queryKey: [`/api/brands/${slug}`] });

  if (q.isLoading) {
    return (
      <Page>
        <Skeleton className="h-64 rounded-3xl" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </Page>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState title="Brand not found" body="This brand page doesn't exist." />
      </Page>
    );
  }

  const b = q.data;
  const accent = b.accent ?? "#101814";
  const light = readableOn(accent) === "light";

  return (
    <Page className="pb-16">
      <section
        className={cn("relative overflow-hidden rounded-3xl p-6 shadow-lift sm:p-10", light ? "text-white" : "text-[#101814]")}
        style={{ backgroundColor: accent }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[28px] border-current opacity-[0.07]" />
        <div className="relative max-w-2xl">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] opacity-70">{KIND[b.kind]}</p>
          <h1 className="display mt-2 text-5xl leading-[0.98] sm:text-7xl">{b.name}</h1>
          {b.tagline && <p className="mt-3 text-[1.0625rem] leading-relaxed opacity-80">{b.tagline}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {b.verified ? (
              <Badge className="bg-white/90 text-[#1f5e3d]">
                <BadgeCheck className="size-3.5" /> Verified brand
              </Badge>
            ) : (
              <Badge className="bg-black/25 text-current">
                <Info className="size-3.5" /> Listed from public information — not managed by {b.name}
              </Badge>
            )}
            {b.isDemo && <DemoBadge />}
          </div>
          {b.website && (
            <Button asChild variant="secondary" size="sm" className="mt-6">
              <a href={b.website} target="_blank" rel="noopener noreferrer">
                <Globe /> Website
              </a>
            </Button>
          )}
        </div>
      </section>

      {b.about && (
        <section className="mx-auto mt-8 max-w-2xl">
          <p className="whitespace-pre-line text-[1.0625rem] leading-relaxed">{b.about}</p>
        </section>
      )}

      {b.programs.length > 0 && (
        <section className="mt-10" aria-labelledby="programs">
          <h2 id="programs" className="eyebrow mb-3">
            Free samples
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {b.programs.map((p) => (
              <Link key={p.id} href={`/strings/${p.stringId}`} className="group">
                <Card className="h-full p-5 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:shadow-lift">
                  <Badge tone="ball">
                    <Gift className="size-3.5" /> Brand-funded sample
                  </Badge>
                  <p className="display mt-3 text-2xl leading-tight">{p.title}</p>
                  {p.pitch && <p className="mt-1 text-sm text-muted">{p.pitch}</p>}
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
                    Find a participating stringer <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="strings">
        <h2 id="strings" className="eyebrow mb-3">
          {b.kind === "retailer" ? "Strings" : `Strings by ${b.name}`}
        </h2>
        {b.strings.length === 0 ? (
          <p className="text-sm text-muted">No strings listed yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {b.strings.map((s) => (
              <Link key={s.id} href={`/strings/${s.id}`} className="group">
                <Card className="flex h-full flex-col p-5 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:shadow-lift">
                  <div aria-hidden className="mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
                  <p className="display text-2xl leading-tight">{s.model}</p>
                  <p className="mt-1 text-sm capitalize text-muted">
                    {s.family}
                    {s.gauges ? ` · ${s.gauges}` : ""}
                  </p>
                  {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{s.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                    <span className="font-mono font-semibold tabular">{s.setPriceCents ? cents(s.setPriceCents) : ""}</span>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
