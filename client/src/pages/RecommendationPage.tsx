import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Share2, AlertTriangle, CheckCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

export default function RecommendationPage() {
  const params = useParams<{ runId: string }>();
  const runId = Number(params.runId);
  const { isPro, isAdmin } = useUser();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/recommendation-runs", runId],
    queryFn: async () => {
      const res = await fetch(`/api/recommendation-runs/${runId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!runId,
  });

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this recommendation with anyone." });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-hevini-red" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center text-court-white">
        <div className="text-center">
          <p className="text-net-grey mb-4">Recommendation not found.</p>
          <Link href="/onboarding">
            <Button className="bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0" style={{ letterSpacing: "0.1em" }}>
              TRY AGAIN
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { recommendation, confidence } = data;
  const { setup, alternatives, explanation, warnings } = recommendation;

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center justify-between mb-10">
          <Link href="/onboarding">
            <button className="flex items-center gap-2 text-net-grey hover:text-court-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <ConfidenceBadge confidence={confidence} />
            {isPro || isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-court-white hover:text-court-white"
                onClick={handleShare}
              >
                <Share2 className="w-3 h-3 mr-1.5" /> SHARE
              </Button>
            ) : (
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-hevini-red hover:text-hevini-red"
                >
                  <Lock className="w-3 h-3 mr-1.5" /> SHARE (PRO)
                </Button>
              </Link>
            )}
          </div>
        </div>

        <h1 className="font-display font-black text-3xl md:text-4xl text-court-white uppercase mb-8" style={{ letterSpacing: "0.04em" }}>
          Your Setup
        </h1>

        {/* Main Setup */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6 mb-4">
          <p className="text-xs text-hevini-red font-bold uppercase mb-4" style={{ letterSpacing: "0.15em" }}>Primary Setup</p>
          <SetupBlock label="MAINS" setup={setup.mains} />
          {setup.crosses && (
            <>
              <div className="border-t border-[#1E1E1E] my-4" />
              <SetupBlock label="CROSSES" setup={setup.crosses} />
            </>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6 mb-4">
          <p className="text-xs text-net-grey font-bold uppercase mb-3" style={{ letterSpacing: "0.15em" }}>Technician's Note</p>
          <p className="text-sm text-court-white leading-relaxed">{explanation}</p>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="bg-hevini-red/5 border border-hevini-red/30 rounded-[4px] p-4 mb-4">
            {warnings.map((w: string, i: number) => (
              <div key={i} className="flex gap-2 text-sm text-hevini-red">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alternatives */}
        {alternatives && alternatives.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-net-grey font-bold uppercase mb-3" style={{ letterSpacing: "0.15em" }}>Alternatives</p>
            <div className="space-y-3">
              {alternatives.map((alt: any, i: number) => (
                <div key={i} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-4">
                  <SetupBlock label={`OPTION ${i + 1}`} setup={alt} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Link href={`/feedback?runId=${runId}`} className="flex-1">
            <Button variant="outline" className="w-full rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white uppercase text-xs font-bold" style={{ letterSpacing: "0.1em" }}>
              RATE THIS SETUP
            </Button>
          </Link>
          <Link href="/onboarding" className="flex-1">
            <Button className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs" style={{ letterSpacing: "0.1em" }}>
              NEW SETUP
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SetupBlock({ label, setup, compact = false }: { label: string; setup: any; compact?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-net-grey uppercase mb-2" style={{ letterSpacing: "0.12em" }}>{label}</p>
      <p className="text-court-white font-bold text-lg mb-1">{setup.stringFamily}</p>
      <p className="text-net-grey text-sm mb-1">{setup.exampleStrings?.join(" / ")}</p>
      {!compact && (
        <div className="flex gap-4 text-xs text-net-grey mt-2">
          <span>Gauge: <span className="text-court-white font-medium">{setup.gauge}</span></span>
          <span>Tension: <span className="text-court-white font-medium">{setup.tension} lbs</span></span>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, { label: string; color: string }> = {
    high: { label: "HIGH CONFIDENCE", color: "text-green-400 border-green-400/30" },
    medium: { label: "MEDIUM CONFIDENCE", color: "text-yellow-400 border-yellow-400/30" },
    estimated: { label: "ESTIMATED", color: "text-net-grey border-[#333]" },
  };
  const { label, color } = map[confidence] || map.estimated;
  return (
    <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-[2px] ${color}`} style={{ letterSpacing: "0.12em" }}>
      {label}
    </span>
  );
}
