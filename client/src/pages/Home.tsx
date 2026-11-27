import { InstallApp } from "@/components/InstallApp";
import * as React from "react";
import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { ArrowRight, Briefcase, MapPin, Plus, Sparkles } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { RacketCard } from "@/features/RacketCard";
import { RacketForm } from "@/features/RacketForm";
import { JobForm } from "@/features/JobForm";
import { useBag, useMyStringers } from "@/hooks/use-bag";
import { useMe } from "@/hooks/use-me";
import { statusText } from "@/components/FreshnessRing";
import type { BagRacket } from "@/lib/types";

const Landing = lazy(() => import("./Landing"));

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { signedIn, loading } = useMe();
  if (loading) return <Page><Skeleton className="h-40 rounded-3xl" /></Page>;
  if (!signedIn) {
    return (
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Landing />
      </Suspense>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const { me } = useMe();
  const bag = useBag();
  const stringers = useMyStringers();
  const [adding, setAdding] = React.useState(false);
  const [logFor, setLogFor] = React.useState<BagRacket | null>(null);

  const rackets = bag.data?.rackets ?? [];
  const due = rackets
    .filter((r) => r.reminderEnabled && (r.reminder.status === "overdue" || r.reminder.status === "due-soon"))
    .sort((a, b) => (a.reminder.daysLeft ?? 0) - (b.reminder.daysLeft ?? 0));
  const neverLogged = rackets.filter((r) => r.reminder.status === "never");

  return (
    <Page>
      <header className="mb-8">
        <p className="eyebrow mb-2">{greeting()}</p>
        <h1 className="display text-[2.75rem] leading-[1] sm:text-6xl">
          {me.firstName ? `${me.firstName}'s` : "Your"} <em className="text-brand">bag</em>
        </h1>
      </header>

      <InstallApp dismissible className="mb-6" />

      {bag.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : rackets.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="Start with your racket"
          body="Add the rackets you play with, log when they were last strung, and 10IS will tell you when they need fresh strings."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={() => setAdding(true)}>
                <Plus /> Add a racket
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/setup">
                  <Sparkles /> Get a string setup
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {due.length > 0 && (
            <section aria-label="Due for a restring" className="mb-8 overflow-hidden rounded-3xl bg-ink p-5 text-bg sm:p-7">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ball">Restring due</p>
              <ul className="mt-3 divide-y divide-bg/10">
                {due.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <Link href={`/bag/${r.id}`} className="min-w-0">
                      <p className="display truncate text-2xl leading-tight">{r.nickname}</p>
                      <p className="text-sm text-bg/65">{statusText(r.reminder)}</p>
                    </Link>
                    <Button variant="ball" size="sm" onClick={() => setLogFor(r)}>
                      Done it
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="rackets-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="rackets-title" className="text-sm font-semibold text-muted">
                Rackets
              </h2>
              <Link href="/bag" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                Manage <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {rackets.map((r) => (
                <RacketCard key={r.id} racket={r} />
              ))}
            </div>
            {neverLogged.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                Tip: tap a racket and log its last restring to start its reminder.
              </p>
            )}
          </section>
        </>
      )}

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link href="/setup" className="group">
          <Card className="h-full p-5 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:shadow-lift">
            <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="size-5" />
            </span>
            <h3 className="display mt-4 text-2xl">Get an AI string setup</h3>
            <p className="mt-1 text-sm text-muted">Tuned to your frame, swing and arm.</p>
          </Card>
        </Link>
        <Link href="/stringers" className="group">
          <Card className="h-full p-5 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:shadow-lift">
            <span className="grid size-10 place-items-center rounded-full bg-grass-soft text-grass">
              <MapPin className="size-5" />
            </span>
            <h3 className="display mt-4 text-2xl">
              {stringers.data?.length ? `My stringers (${stringers.data.length})` : "Find a stringer"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {stringers.data?.length ? "Call, book or get directions in a tap." : "Search nearby and save the ones you trust."}
            </p>
          </Card>
        </Link>
      </section>

      <p className="mt-10 text-center text-sm text-muted">
        <Link href="/business" className="inline-flex items-center gap-1 hover:text-ink">
          Run a shop or a brand? <span className="font-medium text-ink">10IS for Business</span> <ArrowRight className="size-3.5" />
        </Link>
      </p>

      <RacketForm open={adding} onOpenChange={setAdding} />
      {logFor && <JobForm open={!!logFor} onOpenChange={(v) => !v && setLogFor(null)} racket={logFor} />}
    </Page>
  );
}
