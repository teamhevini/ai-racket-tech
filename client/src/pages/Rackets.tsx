import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Lock } from "lucide-react";
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

export default function Rackets() {
  const [query, setQuery] = useState("");
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
            Browse racket specs to find compatible strings for your frame.
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
                    <RacketCard key={r.id} racket={r} featured={isHevini} />
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
    </div>
  );
}

function RacketCard({ racket, featured }: { racket: RacketResult; featured: boolean }) {
  const levelCls =
    LEVEL_STYLE[racket.level ?? "intermediate"] ?? LEVEL_STYLE.intermediate;

  return (
    <div
      className={`bg-[#111] border rounded-[4px] p-4 transition-colors ${
        featured
          ? "border-hevini-red/20 hover:border-hevini-red/50"
          : "border-[#1E1E1E] hover:border-[#333]"
      }`}
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
        {racket.level && (
          <span
            className={`text-[9px] font-bold border px-2 py-0.5 rounded-[2px] uppercase shrink-0 ${levelCls}`}
            style={{ letterSpacing: "0.1em" }}
          >
            {racket.level}
          </span>
        )}
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-net-grey">
      {label}: <span className="text-court-white font-medium">{value}</span>
    </span>
  );
}
