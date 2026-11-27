import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Search, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShopUpgrade } from "./ShopUpgrade";
import type { Customer } from "./types";
import { cents } from "./util";

export function Customers() {
  const q = useQuery<{ pro: boolean; customers: Customer[] }>({ queryKey: ["/api/shop/customers"] });
  const [search, setSearch] = React.useState("");

  if (q.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (q.isError) return <EmptyState title="Couldn't load customers" body={(q.error as Error).message} action={<Button onClick={() => q.refetch()}>Try again</Button>} />;

  const { pro, customers } = q.data!;
  const term = search.trim().toLowerCase();
  const list = term ? customers.filter((c) => [c.name, c.email, c.phone, ...c.rackets].some((x) => x?.toLowerCase().includes(term))) : customers;
  const dueCount = customers.filter((c) => c.due?.length).length;

  return (
    <div className="space-y-6">
      {pro ? (
        <Card className="flex gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-grass-soft text-grass">
            <BellRing className="size-5" />
          </span>
          <div>
            <p className="font-semibold">
              {dueCount ? `${dueCount} regular${dueCount === 1 ? " is" : "s are"} due for a restring` : "No one's due right now"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              When an app player's strings go dead, they get a one-tap “Rebook with you” in their 10IS app. No texts, no emails, no outreach from you — they come back when it's genuinely time.
            </p>
          </div>
        </Card>
      ) : (
        <ShopUpgrade
          title="Know who's due before they do"
          body="Shop Pro flags regulars whose strings are past their best and puts a one-tap rebook with you in their app. No spam, just the right nudge."
        />
      )}

      {customers.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or racket" className="pl-11" aria-label="Search customers" />
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState icon={<Users />} title="Your regulars will live here" body="Every finished job builds a customer card: what they play, what they've spent, and when they were last in." />
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No one matches “{search}”.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c, i) => (
            <li key={c.key} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <CustomerCard c={c} pro={pro} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerCard({ c, pro }: { c: Customer; pro: boolean }) {
  const due = c.due ?? [];
  return (
    <Card className={cn("h-full p-5", due.length > 0 && "ring-clay/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{c.name}</p>
          <p className="truncate text-sm text-muted">
            {c.phone ? (
              <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:text-ink">
                {c.phone}
              </a>
            ) : (
              c.email ?? "No contact saved"
            )}
          </p>
        </div>
        {c.app ? (
          <Badge tone="grass">
            <Smartphone className="size-3" /> On 10IS
          </Badge>
        ) : (
          <Badge>Walk-in</Badge>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted">Jobs</dt>
          <dd className="font-mono text-lg font-semibold tabular">{c.jobs}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Spent</dt>
          <dd className="font-mono text-lg font-semibold tabular">{cents(c.spentCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Last in</dt>
          <dd className="truncate text-sm font-medium leading-7">{relativeDays(c.lastAt)}</dd>
        </div>
      </dl>

      {c.rackets.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {c.rackets.map((r) => (
            <span key={r} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink">
              {r}
            </span>
          ))}
        </div>
      )}

      {pro && due.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {due.map((d) => (
            <Badge key={d.label} tone={d.status === "overdue" ? "brand" : "clay"}>
              <BellRing className="size-3" /> Due for a restring · {d.label}
              {d.daysLeft != null ? (d.daysLeft < 0 ? ` (${Math.abs(d.daysLeft)}d over)` : ` (${d.daysLeft}d)`) : ""}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
