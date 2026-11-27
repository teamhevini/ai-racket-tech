import { Link } from "wouter";
import { ExternalLink, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { cents, stringName, type Offer, type WhereToBuyResponse } from "./types";

export const AFFILIATE_DISCLOSURE = "10IS may earn a commission if you buy through these links. It never changes what we recommend.";

export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 text-xs leading-relaxed text-muted", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {AFFILIATE_DISCLOSURE}{" "}
        <Link href="/how-we-rank" className="font-medium text-ink underline underline-offset-2">
          How we rank
        </Link>
      </span>
    </p>
  );
}

/** Retailer offers, cheapest in-stock first (the server's order — never re-sorted by commission). */
export function OfferList({ offers, src, runId }: { offers: Offer[]; src: "recommendation" | "string-page"; runId?: number }) {
  if (!offers.length) return <p className="text-sm text-muted">No retailers list this string yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {offers.map((o, i) => {
        const href = `/api/go/offer/${o.id}?${runId ? `run=${runId}&` : ""}src=${src}`;
        return (
          <li key={o.id}>
            <a
              href={href}
              target="_blank"
              rel="sponsored noopener"
              className="group flex min-h-[3.25rem] items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium group-hover:underline">{o.retailer}</span>
                <span className={cn("text-xs", o.inStock ? "text-grass" : "text-faint")}>
                  {o.inStock ? (i === 0 ? "In stock · lowest price" : "In stock") : "Out of stock"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono font-semibold tabular">{cents(o.priceCents)}</span>
                <ExternalLink className="size-4 text-muted" aria-hidden />
                <span className="sr-only">(opens retailer site, affiliate link)</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** "Where to buy" for the AI's pick on a recommendation. Hidden when nothing in the catalogue matches. */
export function WhereToBuy({ runId }: { runId: number }) {
  const q = useQuery<WhereToBuyResponse>({ queryKey: [`/api/recommendation-runs/${runId}/where-to-buy`] });
  if (q.isLoading) return <Skeleton className="mb-10 h-40 w-full rounded-2xl" />;
  const list = q.data?.strings ?? [];
  if (!list.length) return null;
  return (
    <section className="mb-10" aria-labelledby="where-to-buy">
      <p id="where-to-buy" className="eyebrow mb-3">
        Where to buy
      </p>
      <div className="space-y-3">
        {list.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/strings/${s.id}`} className="font-semibold hover:underline">
                  {stringName(s)}
                </Link>
                <p className="text-xs capitalize text-muted">{s.family}</p>
              </div>
            </div>
            <OfferList offers={s.offers} src="recommendation" runId={runId} />
          </Card>
        ))}
      </div>
      <AffiliateDisclosure className="mt-3" />
    </section>
  );
}
