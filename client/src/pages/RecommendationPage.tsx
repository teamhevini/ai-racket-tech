import * as React from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Briefcase, CalendarCheck, Info, MapPin, RotateCcw, Share2, Star } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/surface";
import { Sheet } from "@/components/ui/sheet";
import { UpgradeCard } from "@/components/UpgradeCard";
import { JobForm, type JobPrefill } from "@/features/JobForm";
import { BookRestringButton } from "@/features/market/BookRestring";
import { WhereToBuy } from "@/features/market/Offers";
import { SponsoredSlot } from "@/features/market/SponsoredSlot";
import { useMe } from "@/hooks/use-me";
import { useBag } from "@/hooks/use-bag";
import { formatDate } from "@/lib/format";
import type { BagRacket, RecommendationRunResponse } from "@/lib/types";
import type { RecommendationOutput } from "@shared/schema";
import { cn } from "@/lib/utils";

type Setup = RecommendationOutput["setup"]["mains"];

const CONFIDENCE: Record<string, { label: string; tone: "grass" | "clay" | "neutral"; body: string }> = {
  high: { label: "High confidence", tone: "grass", body: "Built from your exact frame specs and full player profile." },
  medium: { label: "Good confidence", tone: "clay", body: "Tuned to your frame and game. Tell us your current strings next time for an even sharper result." },
  estimated: { label: "Estimated", tone: "neutral", body: "We didn't have your racket's specs, so this is a well-reasoned estimate." },
};

/** First number in "52", "52 lbs", "52-54" or "50/52" — never glue the digits together. */
const numericTension = (t: string | undefined) => {
  const m = String(t ?? "").match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
};

export default function RecommendationPage() {
  const { runId } = useParams<{ runId: string }>();
  const id = Number(runId);
  const { signedIn, ent } = useMe();
  const q = useQuery<RecommendationRunResponse>({ queryKey: [`/api/recommendation-runs/${id}`], enabled: Number.isFinite(id) });
  const bag = useBag(signedIn);
  const [picking, setPicking] = React.useState(false);
  const [logFor, setLogFor] = React.useState<BagRacket | null>(null);
  const [shareGate, setShareGate] = React.useState(false);
  // Stable object so the open restring form isn't reset by background refetches.
  const prefill = React.useMemo(() => (q.data ? prefillFrom(q.data) : undefined), [q.data]);

  if (q.isLoading) {
    return (
      <Page narrow>
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="mb-8 h-14 w-3/4" />
        <Skeleton className="mb-4 h-56 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </Page>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Page narrow>
        <EmptyState
          icon={<Info />}
          title="Setup not found"
          body="This link may be wrong or the setup was deleted."
          action={
            <Button asChild>
              <Link href="/setup">Get a new setup</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const data = q.data;
  const rec = data.recommendation;
  const conf = CONFIDENCE[data.confidence] ?? CONFIDENCE.estimated;
  const { mains, crosses } = rec.setup;
  const isHybrid = !!crosses && (crosses.stringFamily !== mains.stringFamily || crosses.exampleStrings[0] !== mains.exampleStrings[0]);



  async function share() {
    if (!ent.share) {
      setShareGate(true);
      return;
    }
    const url = `${window.location.origin}/recommendation/${data.runId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My 10IS string setup", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: "Send it to your stringer or a hitting partner." });
    } catch {
      /* share sheet dismissed */
    }
  }

  function startLog() {
    const rackets = bag.data?.rackets ?? [];
    const linked = rackets.find((r) => r.id === data.savedRacketId);
    if (linked) setLogFor(linked);
    else setPicking(true);
  }

  return (
    <Page narrow>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={signedIn ? "/account?tab=history" : "/setup"}>
            <ArrowLeft /> {signedIn ? "My setups" : "Back"}
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 /> Share
        </Button>
      </div>

      <header className="mb-8 animate-fade-up">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={conf.tone}>{conf.label}</Badge>
          {data.createdAt && <span className="text-xs text-muted">{formatDate(data.createdAt)}</span>}
        </div>
        <h1 className="display text-[2.6rem] leading-[1.02] sm:text-6xl">
          Your setup{data.racketLabel ? <span className="text-muted"> for {data.racketLabel}</span> : null}
        </h1>
        <p className="mt-3 text-sm text-muted">{conf.body}</p>
      </header>

      {data.fallback && (
        <div className="mb-6 flex gap-3 rounded-2xl bg-hard-soft px-4 py-3 text-sm text-hard">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Our AI technician was busy, so this is a safe baseline.{" "}
            <Link href="/setup" className="font-semibold underline underline-offset-4">
              Run it again
            </Link>{" "}
            in a minute for a fully personalised setup.
          </p>
        </div>
      )}

      {/* Primary setup */}
      <Card className="relative mb-4 overflow-hidden rounded-3xl p-0">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-ball/20 blur-3xl" />
        <div className={cn("relative grid divide-line", isHybrid ? "sm:grid-cols-2 sm:divide-x max-sm:divide-y" : "")}>
          <SetupPanel label={isHybrid ? "Mains" : "Full bed"} setup={mains} />
          {isHybrid && <SetupPanel label="Crosses" setup={crosses!} />}
        </div>
      </Card>

      {/* Actions */}
      <div className="mb-10 grid gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={signedIn ? startLog : undefined} asChild={!signedIn} className="sm:col-span-2">
          {signedIn ? (
            <>
              <Briefcase /> Log this setup to a racket
            </>
          ) : (
            <Link href="/signup">
              <Briefcase /> Save it to my bag — join free
            </Link>
          )}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/stringers">
            <MapPin /> Find a stringer
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href={`/feedback?run=${data.runId}`}>
            <Star /> Rate this setup
          </Link>
        </Button>
      </div>

      {/* Get it strung */}
      <Card className="-mt-6 mb-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">Get it strung</p>
          <p className="text-sm text-muted">Book a 10IS stringer with this setup already filled in.</p>
        </div>
        <BookRestringButton
          variant="ink"
          className="shrink-0"
          prefill={{
            savedRacketId: data.isOwner ? data.savedRacketId : null,
            mains: prefill?.mains,
            crosses: prefill?.crosses,
            gauge: prefill?.gauge,
            tensionMains: prefill?.tensionMains ? Number(prefill.tensionMains) : null,
            tensionCrosses: prefill?.tensionCrosses ? Number(prefill.tensionCrosses) : null,
            recommendationRunId: data.isOwner ? data.runId : null,
          }}
        >
          <CalendarCheck /> Book this setup
        </BookRestringButton>
      </Card>

      <section className="mb-8">
        <p className="eyebrow mb-3">Technician's note</p>
        <p className="text-[1.0625rem] leading-relaxed">{rec.explanation}</p>
        {rec.confidenceReason && !data.fallback && <p className="mt-3 text-sm text-muted">{rec.confidenceReason}</p>}
      </section>

      {rec.warnings.length > 0 && (
        <section className="mb-8 space-y-2" aria-label="Warnings">
          {rec.warnings.map((w, i) => (
            <div key={i} className="flex gap-3 rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </section>
      )}

      {rec.alternatives.length > 0 && (
        <section className="mb-10">
          <p className="eyebrow mb-3">Also worth trying</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {rec.alternatives.map((alt, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{alt.stringFamily}</p>
                    <p className="mt-1 text-sm text-muted">{alt.exampleStrings.join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-semibold tabular">{alt.tension}</p>
                    <p className="text-2xs text-muted">lbs · {alt.gauge}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <WhereToBuy runId={data.runId} />

      {/* The one paid placement: after the pick and alternatives, never above or inside them. */}
      <SponsoredSlot runId={data.runId} />

      <div className="flex justify-center">
        <Button asChild variant="ghost">
          <Link href="/setup">
            <RotateCcw /> Start a new setup
          </Link>
        </Button>
      </div>

      {/* Pick which racket to log to */}
      <Sheet open={picking} onOpenChange={setPicking} title="Which racket?" description="We'll pre-fill the restring with this setup.">
        {bag.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (bag.data?.rackets.length ?? 0) === 0 ? (
          <EmptyState
            title="Your bag is empty"
            body="Add a racket first, then log this setup to it."
            action={
              <Button asChild>
                <Link href="/bag?add=1">Add a racket</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {bag.data!.rackets.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    setLogFor(r);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span>
                    <span className="block font-semibold">{r.nickname}</span>
                    <span className="text-sm text-muted">{[r.brand, r.model].filter(Boolean).join(" ") || "Custom racket"}</span>
                  </span>
                  <ArrowLeft className="size-4 rotate-180 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {logFor && (
        <JobForm open={!!logFor} onOpenChange={(v) => !v && setLogFor(null)} racket={logFor} prefill={prefill} />
      )}

      <Sheet open={shareGate} onOpenChange={setShareGate} title="Share your setup">
        <UpgradeCard title="Sharing is a Pro feature" body="Send setups to your stringer or hitting partners with one link." />
      </Sheet>
    </Page>
  );
}

function prefillFrom(data: RecommendationRunResponse): JobPrefill {
  const { mains, crosses } = data.recommendation.setup;
  const isHybrid = !!crosses && (crosses.stringFamily !== mains.stringFamily || crosses.exampleStrings[0] !== mains.exampleStrings[0]);
  return {
    mains: mains.exampleStrings[0] ?? mains.stringFamily,
    crosses: isHybrid ? crosses!.exampleStrings[0] ?? crosses!.stringFamily : undefined,
    gauge: mains.gauge.split(/[ /]/)[0],
    tensionMains: numericTension(mains.tension),
    tensionCrosses: isHybrid ? numericTension(crosses!.tension) : undefined,
    recommendationRunId: data.isOwner ? data.runId : undefined,
  };
}

function SetupPanel({ label, setup }: { label: string; setup: Setup }) {
  return (
    <div className="p-6 sm:p-7">
      <p className="eyebrow mb-4">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="display text-3xl leading-tight">{setup.stringFamily}</p>
          <p className="mt-2 text-sm text-muted">{setup.exampleStrings.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-6 flex items-end gap-6">
        <div>
          <p className="font-mono text-5xl font-semibold leading-none tabular text-brand">{setup.tension}</p>
          <p className="mt-1.5 text-xs text-muted">lbs tension</p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold leading-none tabular">{setup.gauge}</p>
          <p className="mt-1.5 text-xs text-muted">gauge</p>
        </div>
      </div>
    </div>
  );
}
