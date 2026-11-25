import * as React from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { cents, type SponsoredPlacement } from "./types";

/**
 * The one paid placement on a recommendation. Rendered after the AI's pick and
 * its alternatives, never inside or above them. Clearly labelled "Sponsored"
 * (FTC: clear and conspicuous). Paid players never see it.
 */
export function SponsoredSlot({ runId }: { runId: number }) {
  const { ent } = useMe();
  const [, navigate] = useLocation();
  const [why, setWhy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const q = useQuery<{ placement: SponsoredPlacement | null; reason: string }>({
    queryKey: [`/api/recommendation-runs/${runId}/sponsored`],
    enabled: !ent.adFree,
    staleTime: Infinity,
  });
  const p = q.data?.placement;
  if (ent.adFree || !p) return null;

  async function open() {
    if (!p) return;
    setBusy(true);
    try {
      const r = await api<{ code: string; stringId: number }>("POST", `/api/sponsored/${p.campaignId}/click`, { runId });
      navigate(`/strings/${r.stringId}?ref=${encodeURIComponent(r.code)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open that.");
      setBusy(false);
    }
  }

  return (
    <aside aria-label={`Sponsored: paid placement by ${p.paidBy}`} className="mb-10 rounded-3xl border-2 border-dashed border-hard/40 bg-hard-soft/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-bg">Sponsored</span>
        <span className="text-sm font-medium text-ink">Paid placement by {p.paidBy}</span>
      </div>

      <h3 className="display mt-4 text-2xl leading-tight sm:text-3xl">{p.headline}</h3>
      <p className="mt-2 text-sm font-semibold">
        {p.string.brandName} {p.string.model}
        <span className="font-normal capitalize text-muted">
          {" "}
          · {p.string.family}
          {p.string.gauges ? ` · ${p.string.gauges}` : ""}
          {p.string.setPriceCents ? ` · ${cents(p.string.setPriceCents)} a set` : ""}
        </span>
      </p>
      {p.string.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{p.string.description}</p>}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="ink" size="lg" onClick={open} loading={busy} className="sm:flex-1">
          See {p.string.model} <ArrowRight />
        </Button>
        <Button variant="ghost" size="lg" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
          Why am I seeing this?
          <ChevronDown className={cn("transition-transform", why && "rotate-180")} />
        </Button>
      </div>

      {why && (
        <div className="mt-4 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line animate-in fade-in-0">
          {p.whyShown.length > 0 && (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-muted">
              {p.whyShown.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <p className="leading-relaxed">{p.disclosure}</p>
          <p className="mt-2 text-muted">
            Your recommendation above is never for sale. Pro and Club members never see sponsored placements.{" "}
            <Link href="/how-we-rank" className="font-medium text-ink underline underline-offset-2">
              How we rank
            </Link>
          </p>
        </div>
      )}
    </aside>
  );
}
