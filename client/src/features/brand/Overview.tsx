import { useQuery } from "@tanstack/react-query";
import { BarChart3, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { BRAND_PLANS } from "@shared/tiers";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { ApiError } from "@/lib/api";
import { BarList, Funnel, Ring, ShareAreaChart } from "./charts";
import { useBrandCheckout } from "./Plan";
import {
  cap,
  dollars,
  int,
  Kpi,
  Kv,
  Note,
  Panel,
  pct,
  StatusPill,
  SUPPRESSED_NOTE,
  type BrandJson,
  type InsightsResponse,
  type RacketInsights,
  type RetailerInsights,
  type StringInsights,
} from "./shared";

const insightsKey = ["/api/brand/insights"] as const;

export function OverviewTab({ brand }: { brand: BrandJson }) {
  const q = useQuery<InsightsResponse>({ queryKey: insightsKey });

  if (q.isLoading) return <DashboardSkeleton />;
  if (q.error instanceof ApiError && q.error.upgrade) return <LockedInsights brand={brand} />;
  if (q.isError || !q.data) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="Couldn't load insights"
        body={q.error instanceof Error ? q.error.message : undefined}
        action={<Button onClick={() => q.refetch()}>Try again</Button>}
      />
    );
  }
  if (q.data.kind === "string") return <StringDashboard data={q.data.data} />;
  if (q.data.kind === "racket") return <RacketDashboard data={q.data.data} brand={brand} />;
  return <RetailerDashboard data={q.data.data} />;
}

function DashboardSkeleton({ still }: { still?: boolean }) {
  const cls = still ? "rounded-2xl bg-surface-2" : "skeleton rounded-2xl";
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${cls} h-32`} />
        ))}
      </div>
      <div className={`${cls} h-72`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${cls} h-64`} />
        <div className={`${cls} h-64`} />
      </div>
    </div>
  );
}

/** Blurred preview + upgrade card for brands on the free Listing plan. */
function LockedInsights({ brand }: { brand: BrandJson }) {
  const checkout = useBrandCheckout();
  const plan = BRAND_PLANS.insights;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-70 blur-[6px]" aria-hidden>
        <FakePreview />
      </div>
      <div className="absolute inset-0 flex items-start justify-center px-1 pt-10 sm:pt-16">
        <Card className="w-full max-w-md p-6 shadow-lift sm:p-8">
          <span className="grid size-11 place-items-center rounded-full bg-ball text-ball-ink">
            <Lock className="size-5" />
          </span>
          <h2 className="display mt-5 text-3xl leading-tight sm:text-4xl">See how players choose {brand.kind === "racket" ? "strings for your frames" : "your strings"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Demand, retention and ratings from every setup the 10IS technician writes, anonymised and never below 5 players per group.
          </p>
          <ul className="mt-5 space-y-2">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-snug">
                <Check className="mt-0.5 size-4 shrink-0 text-grass" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button size="lg" loading={checkout.isPending} onClick={() => checkout.mutate("insights")}>
              <Sparkles /> Unlock Insights
            </Button>
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink tabular">{plan.price}</span> {plan.cadence}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FakePreview() {
  const pts = [4.1, 4.4, 4.2, 5.0, 5.3, 5.1, 5.8, 6.2, 6.0, 6.7, 7.1, 7.4].map((share, i) => ({
    week: new Date(Date.now() - (11 - i) * 7 * 86_400_000).toISOString().slice(0, 10),
    share,
    recommended: 0,
    total: 0,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Share of AI picks" value="7.4%" sub="+3.3 pts vs 12 weeks ago" tone="up" />
        <Kpi label="Players recommended" value="1,284" />
        <Kpi label="Re-string with you" value="62.0%" />
        <Kpi label="Average rating" value="4.4" />
      </div>
      <Panel title="Share of recommendations">
        <ShareAreaChart points={pts} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── String companies ───────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  recommended: "Recommended",
  affiliate_click: "Clicked",
  booked: "Booked",
  installed: "Installed",
  rated: "Rated",
};

function StringDashboard({ data }: { data: StringInsights }) {
  const weekly = data.weekly;
  const now = weekly[weekly.length - 1]?.share ?? 0;
  const then = weekly[0]?.share ?? 0;
  const delta = Math.round((now - then) * 10) / 10;
  const recommended = data.funnel.find((f) => f.stage === "recommended")?.players ?? null;
  const rated = data.ratings.filter((r) => r.avg != null && r.players != null);
  const ratedPlayers = rated.reduce((a, r) => a + (r.players ?? 0), 0);
  const avgRating = ratedPlayers ? rated.reduce((a, r) => a + (r.avg ?? 0) * (r.players ?? 0), 0) / ratedPlayers : null;
  const funnel = data.funnel.filter((f) => f.stage in STAGE_LABEL).map((f) => ({ label: STAGE_LABEL[f.stage], players: f.players }));
  const totalPicks = weekly.reduce((a, w) => a + w.total, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Share of AI picks this week"
          value={pct(now)}
          sub={`${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts vs ${data.windowWeeks} weeks ago`}
          tone={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}
        />
        <Kpi label="Players recommended" value={<Kv value={recommended} />} sub={`Last ${data.windowWeeks} weeks`} />
        <Kpi
          label="Re-string with you"
          value={<Kv value={data.retention.rate} format={(n) => pct(n)} />}
          sub={data.retention.cohort != null ? `${int(data.retention.cohort)} players with a next restring` : SUPPRESSED_NOTE}
        />
        <Kpi
          label="Average rating"
          value={avgRating == null ? <Kv value={null} /> : <span className="tabular">{avgRating.toFixed(1)}</span>}
          sub={avgRating == null ? SUPPRESSED_NOTE : `out of 5 · ${int(ratedPlayers)} players`}
        />
      </div>

      <Panel
        eyebrow="Demand"
        title="Share of AI recommendations"
        description={`How often the technician's primary pick is one of your strings, week by week. ${int(totalPicks)} picks across the category in ${data.windowWeeks} weeks.`}
      >
        {totalPicks === 0 ? <p className="py-10 text-center text-sm text-muted">No recommendations in this window yet.</p> : <ShareAreaChart points={weekly} />}
      </Panel>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3" eyebrow="Funnel" title="From pick to racket" description="Distinct players at each step, last 12 weeks.">
          <Funnel stages={funnel} />
        </Panel>
        <Panel className="lg:col-span-2" eyebrow="Ratings" title="Ratings by string" description="Average player rating out of 5.">
          {data.ratings.length === 0 ? (
            <p className="text-sm text-muted">Add strings to your catalogue to see ratings.</p>
          ) : (
            <BarList
              max={5}
              format={(n) => n.toFixed(1)}
              barClass="bg-ball"
              rows={[...data.ratings]
                .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
                .map((r) => ({ label: r.model, value: r.avg, sub: r.players != null ? `${int(r.players)}p` : undefined }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Panel eyebrow="Segments" title="By level" description="Your share of the AI's picks within each level.">
          <Segment rows={data.levels} />
        </Panel>
        <Panel eyebrow="Segments" title="By playstyle" description="Your share of the AI's picks within each playstyle.">
          <Segment rows={data.playstyles} />
        </Panel>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel eyebrow="Retention" title="Do players come back?" description="Of players whose racket was strung with you, how many chose you again at the next restring.">
          <div className="flex items-center gap-5">
            <Ring value={data.retention.rate} />
            <div className="min-w-0 text-sm">
              <p className="text-muted">Cohort</p>
              <p className="font-mono text-lg tabular">
                <Kv value={data.retention.cohort} />
              </p>
            </div>
          </div>
          <div className="mt-6">
            <p className="eyebrow mb-3">Where switchers go</p>
            {data.retention.switchedTo.length ? (
              <BarList barClass="bg-clay" rows={data.retention.switchedTo.map((s) => ({ label: s.brand, value: s.players, sub: "players" }))} />
            ) : (
              <p className="text-sm text-muted">No destination has 5 or more switchers yet.</p>
            )}
          </div>
        </Panel>
        <Panel eyebrow="Geography" title="Top regions" description="Where players book or install your strings.">
          {data.regions.length ? (
            <BarList barClass="bg-hard" rows={data.regions.map((r) => ({ label: r.name, value: r.players }))} />
          ) : (
            <p className="text-sm text-muted">No region has 5 or more players yet.</p>
          )}
        </Panel>
        <Panel eyebrow="Frames" title="Paired with" description="Racket brands the AI pairs your strings with.">
          {data.frames.length ? (
            <BarList rows={data.frames.map((r) => ({ label: r.name, value: r.players }))} />
          ) : (
            <p className="text-sm text-muted">No frame has 5 or more players yet.</p>
          )}
        </Panel>
      </div>

      {data.samples.length > 0 && (
        <Panel eyebrow="Samples" title="Sample programme results">
          <SampleTable rows={data.samples} />
        </Panel>
      )}

      <AnonFootnote k={data.kAnonymity} />
    </div>
  );
}

function Segment({ rows }: { rows: Array<{ name: string; share?: number | null; players: number | null }> }) {
  if (!rows.length) return <p className="text-sm text-muted">Not enough data yet.</p>;
  return (
    <BarList
      format={(n) => pct(n)}
      barClass="bg-brand"
      rows={rows.map((r) => ({ label: cap(r.name), value: r.share ?? null, sub: r.players != null ? `${int(r.players)}p` : undefined }))}
    />
  );
}

export function SampleTable({ rows }: { rows: StringInsights["samples"] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-medium">Programme</th>
            <th className="pb-2 text-right font-medium">Claimed</th>
            <th className="pb-2 text-right font-medium">Installed</th>
            <th className="pb-2 text-right font-medium">Rating</th>
            <th className="pb-2 text-right font-medium">Rebuy</th>
            <th className="pb-2 text-right font-medium">Spend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="py-3 pr-3">
                <p className="font-medium">{s.title}</p>
                <div className="mt-1">
                  <StatusPill status={s.status} />
                </div>
              </td>
              <td className="py-3 text-right font-mono tabular">
                {int(s.claimed)}
                <span className="text-faint">/{int(s.unitsTotal)}</span>
              </td>
              <td className="py-3 text-right font-mono tabular">{int(s.installed)}</td>
              <td className="py-3 text-right font-mono">
                <Kv value={s.avgRating} format={(n) => n.toFixed(1)} />
              </td>
              <td className="py-3 text-right font-mono">
                <Kv value={s.rebuyRate} format={(n) => pct(n)} />
              </td>
              <td className="py-3 text-right font-mono tabular">{dollars(s.spendCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnonFootnote({ k }: { k: number }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-2/70 p-4 text-xs leading-relaxed text-muted sm:p-5">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-grass" aria-hidden />
      <p>
        Built from anonymised signals only. Players are a keyed hash, never a name, email or account, and no personal data leaves 10IS. Any group with
        fewer than {k} distinct players is hidden and shown as "—". Last 12 weeks.
      </p>
    </div>
  );
}

// ─── Racket brands ──────────────────────────────────────────────────────────

function RacketDashboard({ data, brand }: { data: RacketInsights; brand: BrandJson }) {
  const top = data.pairings[0];
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Players set up on your frames" value={<Kv value={data.players} />} sub={`Last ${data.windowWeeks} weeks`} />
        <Kpi label="Players with your frame in their bag" value={<Kv value={data.playersWithFrameInBag} />} />
        <Kpi label="Top string pairing" value={<span className="text-2xl sm:text-3xl">{top ? top.name : "—"}</span>} sub={top ? `${int(top.players)} players` : SUPPRESSED_NOTE} />
        <Kpi label="Levels represented" value={int(data.levels.length)} />
      </div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3" eyebrow="Pairings" title={`Strings the AI pairs with ${brand.name}`} description="Distinct players per string recommendation on your frames.">
          {data.pairings.length ? (
            <BarList barClass="bg-hard" rows={data.pairings.map((p) => ({ label: p.name, value: p.players }))} />
          ) : (
            <p className="text-sm text-muted">No pairing has 5 or more players yet.</p>
          )}
        </Panel>
        <Panel className="lg:col-span-2" eyebrow="Segments" title="Who plays your frames">
          {data.levels.length ? (
            <BarList rows={data.levels.map((l) => ({ label: cap(l.name), value: l.players }))} />
          ) : (
            <p className="text-sm text-muted">Not enough data yet.</p>
          )}
        </Panel>
      </div>
      <AnonFootnote k={data.kAnonymity} />
    </div>
  );
}

// ─── Retailers ──────────────────────────────────────────────────────────────

function RetailerDashboard({ data }: { data: RetailerInsights }) {
  const t = data.offers.reduce(
    (a, o) => ({ clicks: a.clicks + o.clicks, orders: a.orders + o.orders, revenue: a.revenue + o.revenueCents, commission: a.commission + o.commissionCents }),
    { clicks: 0, orders: 0, revenue: 0, commission: 0 },
  );
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Clicks from 10IS" value={int(t.clicks)} />
        <Kpi label="Orders" value={int(t.orders)} sub={t.clicks ? `${((t.orders / t.clicks) * 100).toFixed(1)}% conversion` : undefined} />
        <Kpi label="Revenue" value={dollars(t.revenue)} />
        <Kpi label="Commission owed" value={dollars(t.commission)} />
      </div>
      <Panel eyebrow="By string" title="Offer performance">
        {data.offers.length === 0 ? (
          <p className="text-sm text-muted">Add offers to start receiving clicks.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="pb-2 font-medium">String</th>
                  <th className="pb-2 text-right font-medium">Clicks</th>
                  <th className="pb-2 text-right font-medium">Orders</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...data.offers]
                  .sort((a, b) => b.clicks - a.clicks)
                  .map((o) => (
                    <tr key={o.stringId}>
                      <td className="py-3 pr-3">
                        <span className="text-muted">{o.brandName}</span> <span className="font-medium">{o.model}</span>
                      </td>
                      <td className="py-3 text-right font-mono tabular">{int(o.clicks)}</td>
                      <td className="py-3 text-right font-mono tabular">{int(o.orders)}</td>
                      <td className="py-3 text-right font-mono tabular">{dollars(o.revenueCents)}</td>
                      <td className="py-3 text-right font-mono tabular">{dollars(o.commissionCents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Note>Clicks are counted when a player taps through to your product page. Orders appear once your store reports the conversion.</Note>
    </div>
  );
}

export { DashboardSkeleton };
