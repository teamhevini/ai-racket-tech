import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRecommendation } from "@/hooks/use-recommend";
import { useSearchRackets } from "@/hooks/use-rackets";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/contexts/UserContext";
import { Link } from "wouter";
import { Lock } from "lucide-react";

const FREE_RECOMMENDATION_KEY = "10is_rec_count";

function getRemainingRecs(isPro: boolean, isAdmin: boolean): number {
  if (isPro || isAdmin) return Infinity;
  const count = parseInt(localStorage.getItem(FREE_RECOMMENDATION_KEY) || "0", 10);
  return Math.max(0, 1 - count);
}

function incrementRecCount() {
  const count = parseInt(localStorage.getItem(FREE_RECOMMENDATION_KEY) || "0", 10);
  localStorage.setItem(FREE_RECOMMENDATION_KEY, String(count + 1));
}

const GOALS = ["Power", "Control", "Spin", "Comfort", "Durability", "Touch"];
const LEVELS = ["beginner", "intermediate", "advanced", "professional"];
const PLAYSTYLES = ["baseliner", "all-court", "serve&volley", "defensive", "aggressive"];
const SWING_SPEEDS = ["slow", "medium", "fast"];
const INJURY_RISKS = ["none", "elbow", "shoulder", "wrist"];
const FREQUENCIES = ["1-2", "3-4", "5+"];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { isPro, isAdmin, loading } = useUser();
  const { mutate, isPending } = useCreateRecommendation();

  const [racketQuery, setRacketQuery] = useState("");
  const [selectedRacketId, setSelectedRacketId] = useState<number | null>(null);
  const [selectedRacketName, setSelectedRacketName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(racketQuery, 300);
  const { data: racketResults = [] } = useSearchRackets(debouncedQuery);

  const [level, setLevel] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [swingSpeed, setSwingSpeed] = useState("");
  const [injuryRisk, setInjuryRisk] = useState("none");
  const [frequency, setFrequency] = useState("");
  const [stringHistory, setStringHistory] = useState("");
  const [tensionHistory, setTensionHistory] = useState("");

  const remaining = getRemainingRecs(isPro, isAdmin);
  const isBlocked = !loading && !isPro && !isAdmin && remaining === 0;

  function toggleGoal(g: string) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked) return;
    mutate(
      {
        racketId: selectedRacketId,
        level: level || undefined,
        playstyle: (playstyle as any) || undefined,
        goals: goals.length > 0 ? goals : undefined,
        swingSpeed: (swingSpeed as any) || undefined,
        injuryRisk: (injuryRisk as any) || "none",
        frequency: (frequency as any) || undefined,
        stringHistory: stringHistory || undefined,
        tensionHistory: tensionHistory || undefined,
      },
      {
        onSuccess: (data) => {
          if (!isPro && !isAdmin) incrementRecCount();
          navigate(`/recommendation/${data.runId}`);
        },
      }
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-court-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-hevini-red/10 border border-hevini-red/40 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-hevini-red" />
          </div>
          <div>
            <p className="text-hevini-red text-[10px] font-bold uppercase mb-3" style={{ letterSpacing: "0.15em" }}>
              Free Limit Reached
            </p>
            <h2 className="text-court-white font-display font-bold text-2xl mb-2">
              You've used your free recommendation
            </h2>
            <p className="text-net-grey text-sm leading-relaxed">
              Upgrade to Pro for unlimited recommendations, full stringer results, and more.
            </p>
          </div>
          <Link href="/pricing">
            <Button className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 h-12" style={{ letterSpacing: "0.1em" }}>
              UPGRADE TO PRO — $4.99
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <h1 className="font-display font-black text-4xl md:text-5xl text-court-white mb-3 uppercase" style={{ letterSpacing: "0.04em" }}>
            GET YOUR SETUP
          </h1>
          <p className="text-net-grey text-sm">
            Tell us about your racket and playing style. We'll generate a personalized string recommendation.
          </p>
          {!isPro && !isAdmin && (
            <p className="text-xs text-hevini-red mt-2 font-bold">
              {remaining} free recommendation{remaining === 1 ? "" : "s"} remaining —{" "}
              <Link href="/pricing" className="underline">upgrade for unlimited</Link>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Racket */}
          <div className="space-y-2 relative">
            <Label className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>
              Racket (optional)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
              <Input
                value={racketQuery}
                onChange={(e) => { setRacketQuery(e.target.value); setShowDropdown(true); if (!e.target.value) { setSelectedRacketId(null); setSelectedRacketName(""); } }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search brand or model..."
                className="pl-9 bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px]"
              />
            </div>
            {showDropdown && racketResults.length > 0 && (
              <div className="absolute z-20 w-full bg-[#111] border border-[#262626] rounded-[2px] shadow-xl max-h-52 overflow-y-auto">
                {racketResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left hover:bg-[#1E1E1E] text-sm text-court-white border-b border-[#1A1A1A] last:border-0"
                    onClick={() => { setSelectedRacketId(r.id); setSelectedRacketName(`${r.brand} ${r.model}`); setRacketQuery(`${r.brand} ${r.model}`); setShowDropdown(false); }}
                  >
                    <span className="font-medium">{r.brand}</span>{" "}
                    <span className="text-net-grey">{r.model}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedRacketName && (
              <p className="text-xs text-hevini-red">Selected: {selectedRacketName}</p>
            )}
          </div>

          {/* Level */}
          <FieldGroup label="Player Level">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <ChoiceChip key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
              ))}
            </div>
          </FieldGroup>

          {/* Playstyle */}
          <FieldGroup label="Playstyle">
            <div className="flex flex-wrap gap-2">
              {PLAYSTYLES.map((p) => (
                <ChoiceChip key={p} label={p} active={playstyle === p} onClick={() => setPlaystyle(p)} />
              ))}
            </div>
          </FieldGroup>

          {/* Goals */}
          <FieldGroup label="Goals (up to 3)">
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <ChoiceChip key={g} label={g} active={goals.includes(g)} onClick={() => toggleGoal(g)} />
              ))}
            </div>
          </FieldGroup>

          {/* Swing Speed */}
          <FieldGroup label="Swing Speed">
            <div className="flex gap-2">
              {SWING_SPEEDS.map((s) => (
                <ChoiceChip key={s} label={s} active={swingSpeed === s} onClick={() => setSwingSpeed(s)} />
              ))}
            </div>
          </FieldGroup>

          {/* Injury Risk */}
          <FieldGroup label="Injury History">
            <div className="flex flex-wrap gap-2">
              {INJURY_RISKS.map((r) => (
                <ChoiceChip key={r} label={r} active={injuryRisk === r} onClick={() => setInjuryRisk(r)} />
              ))}
            </div>
          </FieldGroup>

          {/* Frequency */}
          <FieldGroup label="Hours per Week">
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <ChoiceChip key={f} label={`${f}h`} active={frequency === f} onClick={() => setFrequency(f)} />
              ))}
            </div>
          </FieldGroup>

          {/* String History */}
          <FieldGroup label="Current String (optional)">
            <Input
              value={stringHistory}
              onChange={(e) => setStringHistory(e.target.value)}
              placeholder="e.g. Luxilon ALU Power 125"
              className="bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px]"
            />
          </FieldGroup>

          {/* Tension History */}
          <FieldGroup label="Current Tension (optional)">
            <Input
              value={tensionHistory}
              onChange={(e) => setTensionHistory(e.target.value)}
              placeholder="e.g. 52 lbs"
              className="bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px]"
            />
          </FieldGroup>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
            style={{ letterSpacing: "0.1em" }}
          >
            {isPending ? (
              <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> GENERATING...</>
            ) : (
              <>GET MY SETUP <ArrowRight className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChoiceChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase transition-colors border ${
        active
          ? "bg-hevini-red border-hevini-red text-white"
          : "border-[#333] text-net-grey hover:border-[#555] hover:text-court-white"
      }`}
      style={{ letterSpacing: "0.08em" }}
    >
      {label}
    </button>
  );
}
