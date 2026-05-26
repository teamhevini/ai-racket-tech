import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitFeedback } from "@/hooks/use-feedback";
import { useToast } from "@/hooks/use-toast";

export default function Feedback() {
  const [, params] = [null, new URLSearchParams(window.location.search)];
  const runId = Number(params.get("runId"));
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { mutate, isPending } = useSubmitFeedback();

  const [ratingPower, setRatingPower] = useState<number | null>(null);
  const [ratingControl, setRatingControl] = useState<number | null>(null);
  const [ratingComfort, setRatingComfort] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      {
        recommendationRunId: runId,
        ratingPower,
        ratingControl,
        ratingComfort,
        durabilityHours: null,
        comments: comments || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Feedback submitted!", description: "Thanks for helping us improve." });
          navigate(runId ? `/recommendation/${runId}` : "/");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to submit. Try again.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <div className="mb-10">
          <Link href={runId ? `/recommendation/${runId}` : "/"}>
            <button className="flex items-center gap-2 text-net-grey hover:text-court-white text-sm transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <h1
            className="font-display font-black text-3xl md:text-4xl text-court-white uppercase mb-2"
            style={{ letterSpacing: "0.04em" }}
          >
            Rate Your Setup
          </h1>
          <p className="text-net-grey text-sm">
            Tell us how the recommendation performed on court.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <RatingGroup label="Power" value={ratingPower} onChange={setRatingPower} />
          <RatingGroup label="Control" value={ratingControl} onChange={setRatingControl} />
          <RatingGroup label="Comfort" value={ratingComfort} onChange={setRatingComfort} />

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>
              Comments (optional)
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Anything you'd like to add..."
              className="bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] resize-none h-28"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
            style={{ letterSpacing: "0.1em" }}
          >
            {isPending ? (
              <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> SUBMITTING...</>
            ) : (
              "SUBMIT FEEDBACK"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function RatingGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>
        {label}
      </Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-[2px] text-sm font-bold border transition-colors ${
              value === n
                ? "bg-hevini-red border-hevini-red text-white"
                : "bg-[#111] border-[#333] text-net-grey hover:border-[#555] hover:text-court-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
