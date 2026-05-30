import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Search, Lock, X, ArrowRight, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAllRackets } from "@/hooks/use-rackets";
import { useUser } from "@/contexts/UserContext";
import type { RacketResult } from "@shared/routes";

const FREE_PER_BRAND = 3;

const LEVEL_STYLE: Record<string, string> = {
  beginner: "text-emerald-400 border-emerald-900",
  intermediate: "text-sky-400 border-sky-900",
  advanced: "text-amber-400 border-amber-900",
  pro: "text-red-500 border-red-900",
};

// String recommendations based on frame specs
function getStringRecs(ra: number | null | undefined, headSize: number | null | undefined) {
  const recs: { type: string; reason: string }[] = [];
  if (ra != null) {
    if (ra < 60) {
      recs.push({ type: "Natural Gut or Multifilament", reason: "Low-stiffness frame — lively strings keep the feel responsive and arm-friendly" });
    } else if (ra <= 67) {
      recs.push({ type: "Polyester or Gut/Poly Hybrid", reason: "Mid-range stiffness suits both control-oriented poly and hybrid setups" });
    } else {
      recs.push({ type: "Soft Multifilament or Arm-friendly Poly", reason: "Stiff frame — softer strings help reduce transmitted shock to the arm" });
    }
  }
  if (headSize != null) {
    if (headSize < 95) {
      recs.push({ type: "Higher tension, control strings", reason: "Small head: tighten the string bed for precision and feel" });
    } else if (headSize <= 100) {
      recs.push({ type: "Balanced tension, versatile setup", reason: "Mid head size suits most string types at standard tension" });
    } else if (headSize <= 107) {
      recs.push({ type: "Mid-tension power strings", reason: "Midplus head: slightly lower tension amplifies the natural launch angle" });
    } else {
      recs.push({ type: "Low tension, power-oriented strings", reason: "Large head: a looser string bed enhances the generous sweet spot" });
    }
  }
  return recs;
}

// ── Racket Detail Modal ──────────────────────────────────────────────────────

function RacketModal({ racket, onClose }: { racket: RacketResult; onClose: () => void }) {
  const [, navigate] = useLocation();
  const levelCls = LEVEL_STYLE[racket.level ?? "intermediate"] ?? LEVEL_STYLE.intermediate;
  const stringRecs = getStringRecs(racket.stiffnessRa, racket.headSize);
  const isHeviniSolution1 = racket.brand === "Hevini" && racket.model === "Solution 1";

  const racketLabel = encodeURIComponent(`${racket.brand} ${racket.model}`);
  const onboardingUrl = `/onboarding?racketId=${racket.id}&racketName=${racketLabel}`;

  function handleGetRec() {
    onClose();
    navigate(onboardingUrl);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg bg-[#0A0A0A] border border-[#1A1A1A] rounded-t-[8px] sm:rounded-[4px] shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex items-center justify-center bg-[#1C1C1C] border border-[#333] rounded-[4px] text-net-grey hover:text-court-white hover:border-[#555] transition-colors"
          style={{ width: 40, height: 40 }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6">
          {/* Header */}
          <div className="mb-5 pr-10">
            <div className="flex items-center gap-2 mb-1">
              <p
                className={`text-[10px] font-bold uppercase ${racket.brand === "Hevini" ? "text-hevini-red" : "text-net-grey"}`}
                style={{ letterSpacing: "0.12em" }}
              >
                {racket.brand}
              </p>
              {racket.level && (
                <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-[2px] uppercase ${levelCls}`} style={{ letterSpacing: "0.08em" }}>
                  {racket.level}
                </span>
              )}
            </div>
            <h2 className="text-court-white font-bold text-xl leading-tight">{racket.model}</h2>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Head Size", value: racket.headSize ? `${racket.headSize} in²` : null },
              { label: "Weight (unstrung)", value: racket.weightUnstrung ? `${racket.weightUnstrung} g` : null },
              { label: "String Pattern", value: racket.stringPattern },
              { label: "RA Stiffness", value: racket.stiffnessRa != null ? String(racket.stiffnessRa) : null },
              { label: "Beam Width", value: racket.beamWidth },
              { label: "Balance", value: racket.balance },
              { label: "Rec. Tension", value: racket.recTensionMin && racket.recTensionMax ? `${racket.recTensionMin}–${racket.recTensionMax} lbs` : null },
              { label: "Year", value: racket.year ? String(racket.year) : null },
            ]
              .filter((s) => s.value)
              .map((s) => (
                <div key={s.label} className="bg-[#111] border border-[#1A1A1A] rounded-[4px] px-3 py-2.5">
                  <p className="text-[9px] font-bold text-net-grey uppercase mb-1" style={{ letterSpacing: "0.1em" }}>{s.label}</p>
                  <p className="text-court-white font-medium text-sm">{s.value}</p>
                </div>
              ))}
          </div>

          {/* String recommendations */}
          {stringRecs.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-net-grey uppercase mb-3" style={{ letterSpacing: "0.12em" }}>
                Recommended String Types
              </p>
              <div className="space-y-2">
                {stringRecs.map((rec) => (
                  <div key={rec.type} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[4px] p-3">
                    <p className="text-court-white font-bold text-xs mb-0.5">{rec.type}</p>
                    <p className="text-net-grey text-[11px] leading-snug">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {racket.sourceUrl && (
            <a
              href={racket.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-net-grey hover:text-hevini-red transition-colors mb-5"
            >
              <ExternalLink className="w-3 h-3" />
              View racket details
            </a>
          )}

          {/* CTA buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleGetRec}
              className="w-full h-11 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs"
              style={{ letterSpacing: "0.1em" }}
            >
              GET RECOMMENDATION WITH THIS RACKET <ArrowRight className="ml-2 w-3.5 h-3.5" />
            </Button>
            {isHeviniSolution1 && (
              <a href="https://hevinisporting.com" target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-[2px] border-hevini-red text-hevini-red hover:bg-hevini-red hover:text-white font-bold uppercase text-xs transition-colors"
                  style={{ letterSpacing: "0.1em" }}
                >
                  GET THE HEVINI SOLUTION 1
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Rackets() {
  const [query, setQuery] = useState("");
  const [selectedRacket, setSelectedRacket] = useState<RacketResult | null>(null);
  const { canViewAllRackets, isAdmin } = useUser();
  const { data: allRackets = [], isLoading } = useAllRackets();
  const canSeeAll = canViewAllRackets || isAdmin;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRackets;
    return allRackets.filter(
      (r) => r.brand.toLowerCase().includes(q) || r.model.toLowerCase().includes(q)
    );
  }, [allRackets, query]);

  const groups = useMemo(() => {
    const map = new Map<string, RacketResult[]>();
    for (const r of filtered) {
      if (!map.has(r.brand)) map.set(r.brand, []);
      map.get(r.brand)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "Hevini") return -1;
      if (b === "Hevini") return 1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <h1
            className="font-display font-black text-4xl md:text-5xl text-court-white mb-3 uppercase"
            style={{ letterSpacing: "0.04em" }}
          >
            Rackets
          </h1>
          <p className="text-net-grey text-sm">
            Browse racket specs and click any card to see compatible string types.
          </p>
        </div>

        <div className="relative mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand or model..."
            className="pl-9 bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] h-11"
          />
        </div>

        {isLoading && (
          <div className="text-net-grey text-sm text-center py-16">Loading rackets...</div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="text-net-grey text-sm text-center py-16">No rackets found.</div>
        )}

        <div className="space-y-12">
          {groups.map(([brand, brandRackets]) => {
            const isHevini = brand === "Hevini";
            const visible = canSeeAll ? brandRackets : brandRackets.slice(0, FREE_PER_BRAND);
            const hidden = canSeeAll ? [] : brandRackets.slice(FREE_PER_BRAND);

            return (
              <section key={brand}>
                {/* Brand header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2
                    className={`font-display font-black text-base uppercase shrink-0 ${isHevini ? "text-hevini-red" : "text-court-white"}`}
                    style={{ letterSpacing: "0.12em" }}
                  >
                    {brand}
                  </h2>
                  {isHevini && (
                    <span
                      className="text-[9px] font-bold bg-hevini-red text-white px-2 py-0.5 rounded-[2px] shrink-0"
                      style={{ letterSpacing: "0.12em" }}
                    >
                      FEATURED
                    </span>
                  )}
                  <div className="flex-1 h-px bg-[#1A1A1A]" />
                  <span className="text-[10px] text-net-grey shrink-0">
                    {brandRackets.length} racket{brandRackets.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Visible cards */}
                <div className="space-y-2">
                  {visible.map((r) => (
                    <RacketCard
                      key={r.id}
                      racket={r}
                      featured={isHevini}
                      onClick={() => setSelectedRacket(r)}
                    />
                  ))}
                </div>

                {/* Locked section */}
                {hidden.length > 0 && (
                  <div className="relative mt-2 rounded-[4px] overflow-hidden">
                    <div className="blur-sm opacity-40 pointer-events-none select-none space-y-2">
                      {hidden.slice(0, 2).map((r) => (
                        <RacketCard key={r.id} racket={r} featured={false} />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/70">
                      <div className="text-center px-4">
                        <Lock className="w-4 h-4 text-hevini-red mx-auto mb-2" />
                        <p className="text-court-white font-bold text-xs mb-3">
                          {hidden.length} more {brand} racket{hidden.length !== 1 ? "s" : ""} hidden
                        </p>
                        <Link href="/pricing">
                          <Button
                            size="sm"
                            className="bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-[10px] h-7 px-4"
                            style={{ letterSpacing: "0.1em" }}
                          >
                            UPGRADE TO PRO
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Racket detail modal */}
      {selectedRacket && (
        <RacketModal racket={selectedRacket} onClose={() => setSelectedRacket(null)} />
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

function RacketCard({
  racket,
  featured,
  onClick,
}: {
  racket: RacketResult;
  featured: boolean;
  onClick?: () => void;
}) {
  const levelCls =
    LEVEL_STYLE[racket.level ?? "intermediate"] ?? LEVEL_STYLE.intermediate;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-[#111] border rounded-[4px] p-4 transition-colors ${
        featured
          ? "border-hevini-red/20 hover:border-hevini-red/60"
          : "border-[#1E1E1E] hover:border-[#444]"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-court-white font-bold text-sm truncate">{racket.model}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {racket.headSize && (
              <Spec label="Head" value={`${racket.headSize} in²`} />
            )}
            {racket.weightUnstrung && (
              <Spec label="Weight" value={`${racket.weightUnstrung}g`} />
            )}
            {racket.stringPattern && (
              <Spec label="Pattern" value={racket.stringPattern} />
            )}
            {racket.recTensionMin && racket.recTensionMax && (
              <Spec
                label="Tension"
                value={`${racket.recTensionMin}–${racket.recTensionMax} lbs`}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {racket.level && (
            <span
              className={`text-[9px] font-bold border px-2 py-0.5 rounded-[2px] uppercase ${levelCls}`}
              style={{ letterSpacing: "0.1em" }}
            >
              {racket.level}
            </span>
          )}
          {onClick && (
            <ArrowRight className="w-3.5 h-3.5 text-net-grey opacity-40" />
          )}
        </div>
      </div>
    </button>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-net-grey">
      {label}: <span className="text-court-white font-medium">{value}</span>
    </span>
  );
}
