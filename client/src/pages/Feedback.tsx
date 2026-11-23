import * as React from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Info } from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { Field, Textarea, UnitInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { RecommendationRunResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCALES = [
  { key: "ratingPower", label: "Power", low: "Dead", high: "Launchy" },
  { key: "ratingControl", label: "Control", low: "Spraying", high: "On a string" },
  { key: "ratingComfort", label: "Comfort", low: "Harsh", high: "Plush" },
] as const;

type ScaleKey = (typeof SCALES)[number]["key"];

export default function Feedback() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const runId = Number(params.get("run") ?? params.get("runId")) || null;

  const run = useQuery<RecommendationRunResponse>({ queryKey: [`/api/recommendation-runs/${runId}`], enabled: !!runId });
  const [ratings, setRatings] = React.useState<Record<ScaleKey, number | null>>({
    ratingPower: null,
    ratingControl: null,
    ratingComfort: null,
  });
  const [hours, setHours] = React.useState("");
  const [comments, setComments] = React.useState("");

  const submit = useMutation({
    mutationFn: () =>
      api("POST", "/api/feedback", {
        recommendationRunId: runId,
        ...ratings,
        durabilityHours: hours ? Number(hours) : null,
        comments: comments.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Thanks — that helps us tune the next setup.");
      navigate(`/recommendation/${runId}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send feedback."),
  });

  if (!runId) {
    return (
      <Page narrow>
        <EmptyState
          icon={<Info />}
          title="Which setup?"
          body="Open a recommendation and tap “Rate this setup” to leave feedback."
          action={
            <Button asChild>
              <Link href="/setup">Get a setup</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const hasAny = Object.values(ratings).some((v) => v !== null) || !!hours || !!comments.trim();
  const mains = run.data?.recommendation.setup.mains;

  return (
    <Page narrow>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link href={`/recommendation/${runId}`}>
          <ArrowLeft /> Back to setup
        </Link>
      </Button>

      <PageHeader
        eyebrow="Feedback"
        title="How did it play?"
        description={
          mains ? (
            <>
              {mains.exampleStrings[0] ?? mains.stringFamily} at <span className="font-mono tabular">{mains.tension}</span> lbs
              {run.data?.racketLabel ? ` in your ${run.data.racketLabel}` : ""}.
            </>
          ) : (
            "Tell us how the strings felt after a few sessions."
          )
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-4"
      >
        {SCALES.map((s) => (
          <Card key={s.key} className="p-5">
            <fieldset>
              <legend className="mb-3 font-semibold">{s.label}</legend>
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={s.label}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = ratings[s.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setRatings((r) => ({ ...r, [s.key]: on ? null : n }))}
                      className={cn(
                        "h-12 rounded-xl font-mono text-lg font-semibold tabular ring-1 transition-all duration-200 ease-spring active:scale-95",
                        on ? "bg-ink text-bg ring-ink" : "bg-surface-2/60 text-muted ring-transparent hover:ring-line",
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-faint">
                <span>{s.low}</span>
                <span>{s.high}</span>
              </div>
            </fieldset>
          </Card>
        ))}

        <Card className="space-y-4 p-5">
          <Field label="How long did the strings last?" optional hint="Hours of play before they felt dead or broke.">
            <UnitInput unit="hours" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ""))} placeholder="15" />
          </Field>
          <Field label="Anything else?" optional>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={2000}
              placeholder="Great spin, a bit stiff on serves…"
            />
          </Field>
        </Card>

        <div className="sticky bottom-24 pt-2 md:bottom-6">
          <Button type="submit" size="lg" className="w-full" disabled={!hasAny} loading={submit.isPending}>
            Send feedback
          </Button>
        </div>
      </form>
    </Page>
  );
}
