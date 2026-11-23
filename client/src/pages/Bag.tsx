import * as React from "react";
import { Link, Redirect } from "wouter";
import { Briefcase, Plus } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/surface";
import { UpgradeCard } from "@/components/UpgradeCard";
import { RacketCard } from "@/features/RacketCard";
import { RacketForm } from "@/features/RacketForm";
import { useBag } from "@/hooks/use-bag";
import { useMe } from "@/hooks/use-me";

const order = { overdue: 0, "due-soon": 1, fresh: 2, never: 3 } as const;

export default function Bag() {
  const { signedIn, loading } = useMe();
  const bag = useBag(signedIn);
  const [adding, setAdding] = React.useState(() => new URLSearchParams(window.location.search).get("add") === "1");

  if (!loading && !signedIn) return <Redirect to="/login?next=/bag" />;

  const rackets = [...(bag.data?.rackets ?? [])].sort(
    (a, b) => order[a.reminder.status] - order[b.reminder.status] || (a.reminder.daysLeft ?? 0) - (b.reminder.daysLeft ?? 0),
  );
  const limit = bag.data?.limit ?? null;
  const full = limit !== null && rackets.length >= limit;

  return (
    <Page>
      <PageHeader
        eyebrow="My bag"
        title="Your rackets"
        description="Every frame you play with, how fresh its strings are, and when it's due next."
        action={
          rackets.length > 0 && !full ? (
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add racket
            </Button>
          ) : undefined
        }
      />

      {bag.isLoading || loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[112px] rounded-2xl" />
          ))}
        </div>
      ) : bag.isError ? (
        <EmptyState title="Couldn't load your bag" body={(bag.error as Error).message} action={<Button onClick={() => bag.refetch()}>Try again</Button>} />
      ) : rackets.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="Your bag is empty"
          body="Add the rackets you play with. Log each restring and we'll remind you when the strings are past their best."
          action={
            <Button size="lg" onClick={() => setAdding(true)}>
              <Plus /> Add your first racket
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rackets.map((r, i) => (
            <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <RacketCard racket={r} />
            </div>
          ))}
        </div>
      )}

      {full && (
        <UpgradeCard
          className="mt-6"
          title={`Free plan holds ${limit} rackets`}
          body="Upgrade for unlimited rackets and the full restring history of every one."
        />
      )}

      {limit !== null && rackets.length > 0 && !full && (
        <p className="mt-4 text-center text-xs text-muted">
          {rackets.length} of {limit} rackets on the free plan ·{" "}
          <Link href="/pricing" className="underline underline-offset-2">
            go unlimited
          </Link>
        </p>
      )}

      <RacketForm open={adding} onOpenChange={setAdding} />
    </Page>
  );
}
