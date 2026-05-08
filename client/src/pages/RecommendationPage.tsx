import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function RecommendationPage() {
  const { runId } = useParams<{ runId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/recommendation-runs", runId],
    queryFn: async () => {
      const res = await fetch(`/api/recommendation-runs/${runId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recommendation");
      return res.json();
    },
    enabled: !!runId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center">
        <div className="text-net-grey text-sm uppercase tracking-widest animate-pulse">
          Loading recommendation...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-court-black flex flex-col items-center justify-center gap-4">
        <p className="text-net-grey">Recommendation not found.</p>
        <Link href="/onboarding">
          <Button className="bg-hevini-red hover:bg-hevini-red-dark text-white border-0">
            Try Again
          </Button>
        </Link>
      </div>
    );
  }

  const { recommendation, confidence } = data;
  const { setup, alternatives, explanation, warnings, confidenceReason } = recommendation;

  return (
    <div className="min-h-screen bg-court-black text-court-white py-12">
      <div className="container max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/onboarding">
              <button className="text-net-grey hover:text-court-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="font-display font-black text-3xl" style={{ letterSpacing: "0.04em" }}>
                YOUR SETUP
              </h1>
              <p className="text-net-grey text-xs uppercase mt-1" style={{ letterSpacing: "0.1em" }}>
                Confidence: {confidence}
              </p>
            </div>
          </div>

          {/* Main Setup */}
          <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase text-hevini-red" style={{ letterSpacing: "0.12em" }}>
              Recommended Setup
            </h2>
            <SetupCard label="Mains" setup={setup.mains} />
            {setup.crosses && <SetupCard label="Crosses" setup={setup.crosses} />}
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6">
              <h2 className="text-xs font-bold uppercase text-net-grey mb-3" style={{ letterSpacing: "0.12em" }}>
                Technician's Notes
              </h2>
              <p className="text-court-white text-sm leading-relaxed">{explanation}</p>
              {confidenceReason && (
                <p className="text-net-grey text-xs mt-3 italic">{confidenceReason}</p>
              )}
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="bg-hevini-red/10 border border-hevini-red/30 rounded-[4px] p-4 space-y-2">
              <div className="flex items-center gap-2 text-hevini-red">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.1em" }}>
                  Heads Up
                </span>
              </div>
              {warnings.map((w: string, i: number) => (
                <p key={i} className="text-sm text-net-grey">{w}</p>
              ))}
            </div>
          )}

          {/* Alternatives */}
          {alternatives && alternatives.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.12em" }}>
                Alternatives
              </h2>
              {alternatives.map((alt: any, i: number) => (
                <div key={i} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
                  <SetupCard label={alt.stringFamily} setup={alt} />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/onboarding" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-[#2A2A2A] text-net-grey hover:text-court-white"
              >
                Start Over
              </Button>
            </Link>
            <Link href={`/feedback?runId=${runId}`} className="flex-1">
              <Button className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white border-0">
                Rate This Setup
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SetupCard({ label, setup }: { label: string; setup: any }) {
  return (
    <div>
      <p className="text-xs text-net-grey uppercase mb-1" style={{ letterSpacing: "0.1em" }}>{label}</p>
      <p className="text-court-white font-medium">
        {setup.exampleStrings?.[0] || setup.stringFamily}
      </p>
      <p className="text-net-grey text-sm">
        {setup.gauge && `${setup.gauge} gauge`}
        {setup.tension && ` • ${setup.tension} lbs`}
      </p>
    </div>
  );
}
