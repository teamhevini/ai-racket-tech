import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useSubmitFeedback } from "@/hooks/use-feedback";

export default function Feedback() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const runId = params.get("runId") ? Number(params.get("runId")) : null;

  const { mutate: submitFeedback, isPending } = useSubmitFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    submitFeedback(
      { runId, rating, comment: comment || null },
      {
        onSuccess: () => navigate("/"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-court-black text-court-white py-12">
      <div className="container max-w-lg mx-auto px-4">
        <h1 className="font-display font-black text-3xl mb-8" style={{ letterSpacing: "0.04em" }}>
          RATE YOUR SETUP
        </h1>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase text-net-grey mb-3" style={{ letterSpacing: "0.12em" }}>
              How accurate was this recommendation?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`w-12 h-12 rounded-[2px] border text-sm font-bold transition-colors ${
                    rating === r
                      ? "bg-hevini-red border-hevini-red text-white"
                      : "border-[#2A2A2A] text-net-grey hover:border-[#444]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-net-grey mb-3" style={{ letterSpacing: "0.12em" }}>
              Comments (optional)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us how the setup worked for you..."
              className="w-full h-32 bg-[#111] border border-[#2A2A2A] rounded-[2px] px-4 py-3 text-sm text-court-white placeholder:text-net-grey focus:outline-none focus:border-hevini-red resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isPending || !rating}
            className="w-full h-12 bg-hevini-red hover:bg-hevini-red-dark text-white border-0 rounded-[2px] font-bold uppercase"
            style={{ letterSpacing: "0.1em" }}
          >
            {isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
