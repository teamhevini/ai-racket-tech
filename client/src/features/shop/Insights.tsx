import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Check, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ShopUpgrade } from "./ShopUpgrade";
import type { Insights as InsightsData, Programs } from "./types";
import { cents, errMsg, invalidateShop, isUpgrade } from "./util";

const monthName = new Intl.DateTimeFormat(undefined, { month: "short" });
const labelFor = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return monthName.format(new Date(y, m - 1, 15));
};

export function Insights() {
  const q = useQuery<InsightsData>({ queryKey: ["/api/shop/insights"], retry: false });

  return (
    <div className="space-y-10">
      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        isUpgrade(q.error) ? (
          <div className="space-y-4">
            <ShopUpgrade
              title="See what your shop is really doing"
              body="Shop Pro adds monthly jobs and revenue, your top strings with player ratings, repeat-customer rate and sample payouts."
            />
            <div aria-hidden className="pointer-events-none grid select-none grid-cols-6 items-end gap-2 rounded-2xl bg-surface p-5 opacity-50 blur-[2px] ring-1 ring-line">
              {[40, 55, 48, 70, 62, 85].map((h, i) => (
                <div key={i} className="rounded-t-lg bg-surface-2" style={{ height: h * 1.4 }} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Couldn't load insights" body={(q.error as Error).message} action={<Button onClick={() => q.refetch()}>Try again</Button>} />
        )
      ) : (
        <ProInsights data={q.data!} />
      )}

      <SamplePrograms />
    </div>
  );
}

function ProInsights({ data }: { data: InsightsData }) {
  const maxJobs = Math.max(1, ...data.monthly.map((m) => m.jobs));
  const total = data.monthly.reduce((s, m) => s + m.revenueCents, 0);
  const stats: Array<[string, string, string?]> = [
    ["Customers", String(data.customers)],
    ["Repeat rate", data.repeatRate == null ? "—" : `${data.repeatRate}%`, "came back at least twice"],
    ["Avg rating", data.avgRating == null ? "—" : `${data.avgRating.toFixed(1)}★`, "from app players"],
    ["Sample payouts", cents(data.samplePayoutCents), `${data.sampleInstalls} install${data.sampleInstalls === 1 ? "" : "s"}`],
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <Card key={label} className="p-4 sm:p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular sm:text-3xl">{value}</p>
            {hint && <p className="mt-0.5 text-2xs text-faint">{hint}</p>}
          </Card>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Last six months</p>
            <h3 className="display mt-1 text-3xl">Jobs & revenue</h3>
          </div>
          <p className="text-sm text-muted">
            <span className="font-mono font-semibold tabular text-ink">{cents(total)}</span> total
          </p>
        </div>
        {data.monthly.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Finished jobs will chart here.</p>
        ) : (
          <div className="mt-6 flex h-56 items-end gap-2 sm:gap-4" role="list">
            {data.monthly.map((m) => (
              <div key={m.month} role="listitem" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" aria-label={`${labelFor(m.month)}: ${m.jobs} jobs, ${cents(m.revenueCents)}`}>
                <span className="font-mono text-xs font-semibold tabular">{m.jobs}</span>
                <div className="relative w-full max-w-14 overflow-hidden rounded-t-xl bg-ink/90 transition-[height] duration-700 ease-spring" style={{ height: `${(m.jobs / maxJobs) * 100}%`, minHeight: 6 }}>
                  <div className="absolute inset-x-0 bottom-0 bg-grass" style={{ height: `${m.jobs ? (m.app / m.jobs) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-muted">{labelFor(m.month)}</span>
                <span className="hidden font-mono text-2xs tabular text-faint sm:block">{cents(m.revenueCents)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-grass" /> Booked in the app
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-ink/90" /> Walk-in
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 pb-3 sm:p-6 sm:pb-3">
          <p className="eyebrow">What you install</p>
          <h3 className="display mt-1 text-3xl">Top strings</h3>
        </div>
        {data.topStrings.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted">Pick strings from the catalogue on jobs to see them here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium sm:px-6">String</th>
                <th className="px-3 py-2.5 text-right font-medium">Jobs</th>
                <th className="px-5 py-2.5 text-right font-medium sm:px-6">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.topStrings.map((s, i) => (
                <tr key={`${s.brandName}-${s.model}`}>
                  <td className="px-5 py-3 sm:px-6">
                    <span className="mr-2 font-mono text-xs text-faint">{i + 1}</span>
                    <span className="font-medium">
                      {s.brandName} {s.model}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular">{s.jobs}</td>
                  <td className="px-5 py-3 text-right sm:px-6">
                    {s.avgRating == null ? (
                      <span className="text-faint">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono tabular">
                        <Star className="size-3.5 fill-ball text-ball-ink" /> {s.avgRating.toFixed(1)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SamplePrograms() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const q = useQuery<Programs>({ queryKey: ["/api/shop/programs"] });
  const toggle = useMutation({
    mutationFn: (v: { id: number; join: boolean }) => api("POST", `/api/shop/programs/${v.id}/${v.join ? "join" : "leave"}`),
    onSuccess: (_d, v) => {
      toast.success(v.join ? "You're in — app players can now book this sample with you" : "Left the programme");
      invalidateShop(qc);
    },
    onError: (e) => {
      if (isUpgrade(e)) toast.error(errMsg(e), { action: { label: "Upgrade", onClick: () => navigate("/shop/billing") } });
      else toast.error(errMsg(e));
    },
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Get paid to install</p>
          <h2 className="display mt-1 text-3xl sm:text-4xl">Sample programmes</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            String brands pay you to put a free sample set in a player's racket. Players find you through the programme; you're paid per install.
          </p>
        </div>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : q.isError ? (
        <EmptyState title="Couldn't load programmes" body={(q.error as Error).message} />
      ) : !q.data!.programs.length ? (
        <EmptyState icon={<Gift />} title="No programmes running right now" body="When a brand launches a sample programme, it'll show up here." />
      ) : (
        <>
          {!q.data!.pro && (
            <ShopUpgrade compact className="mb-4" title="Joining is a Shop Pro feature" body="Brands pay you per install, straight from the programme." />
          )}
          <ul className="grid gap-3 md:grid-cols-2">
            {q.data!.programs.map((p) => (
              <li key={p.id}>
                <Card className={cn("flex h-full flex-col p-5", p.joined && "ring-grass/40")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="eyebrow">{p.brandName}</p>
                      <p className="mt-1 text-lg font-semibold leading-snug">{p.title}</p>
                      <p className="text-sm text-muted">
                        {p.string.brandName} {p.string.model} · <span className="capitalize">{p.string.family}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-2xl font-semibold tabular">{cents(p.payoutCents)}</p>
                      <p className="text-2xs text-muted">per install</p>
                    </div>
                  </div>
                  {p.pitch && <p className="mt-3 text-sm leading-relaxed text-muted">{p.pitch}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    {p.joined ? (
                      <Badge tone="grass">
                        <Check className="size-3" /> Joined
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <Button
                      variant={p.joined ? "ghost" : "ink"}
                      className="h-12"
                      loading={toggle.isPending && toggle.variables?.id === p.id}
                      onClick={() => toggle.mutate({ id: p.id, join: !p.joined })}
                    >
                      {p.joined ? "Leave" : "Join programme"}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Payouts shown after the {q.data!.feePct}% 10IS platform fee. <Link href="/shop/billing" className="underline underline-offset-2 hover:text-ink">Plans</Link>
          </p>
        </>
      )}
    </section>
  );
}
