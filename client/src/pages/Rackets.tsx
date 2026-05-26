import { useState } from "react";
import { Link } from "wouter";
import { Search, Lock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchRackets } from "@/hooks/use-rackets";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/contexts/UserContext";
import type { RacketResult } from "@shared/routes";

const FREE_LIMIT = 3;

export default function Rackets() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { data: results = [], isLoading } = useSearchRackets(debouncedQuery);
  const { canViewAllRackets, isAdmin } = useUser();

  const visibleResults = canViewAllRackets ? results : results.slice(0, FREE_LIMIT);
  const hiddenCount = results.length - visibleResults.length;

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
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

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand or model..."
            className="pl-9 bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] h-11"
          />
        </div>

        {isLoading && (
          <div className="text-net-grey text-sm text-center py-12">Searching...</div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="text-net-grey text-sm text-center py-12">No rackets found.</div>
        )}

        {!query && (
          <div className="text-net-grey text-sm text-center py-12">
            Type a brand or model name to search.
          </div>
        )}

        {visibleResults.length > 0 && (
          <div className="space-y-2 mb-4">
            {visibleResults.map((r) => (
              <RacketCard key={r.id} racket={r} />
            ))}
          </div>
        )}

        {hiddenCount > 0 && !isAdmin && (
          <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6 text-center">
            <Lock className="w-6 h-6 text-hevini-red mx-auto mb-3" />
            <p className="text-court-white font-bold text-sm mb-1">
              {hiddenCount} more result{hiddenCount !== 1 ? "s" : ""} hidden
            </p>
            <p className="text-net-grey text-xs mb-4">
              Upgrade to Pro to see all racket results.
            </p>
            <Link href="/pricing">
              <Button
                className="bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs h-9 px-6"
                style={{ letterSpacing: "0.1em" }}
              >
                UPGRADE TO PRO
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function RacketCard({ racket }: { racket: RacketResult }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] hover:border-[#333] rounded-[4px] p-4 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-court-white font-bold text-sm">
            {racket.brand}{" "}
            <span className="text-net-grey font-normal">{racket.model}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {racket.headSize && (
              <Spec label="Head" value={`${racket.headSize} in²`} />
            )}
            {racket.stringPattern && (
              <Spec label="Pattern" value={racket.stringPattern} />
            )}
            {racket.stiffnessRa && (
              <Spec label="RA" value={String(racket.stiffnessRa)} />
            )}
            {racket.recTensionMin && racket.recTensionMax && (
              <Spec
                label="Tension"
                value={`${racket.recTensionMin}–${racket.recTensionMax} lbs`}
              />
            )}
            {racket.weightUnstrung && (
              <Spec label="Weight" value={`${racket.weightUnstrung}g`} />
            )}
          </div>
        </div>
        {racket.level && (
          <span
            className="text-[9px] font-bold border border-[#333] px-2 py-0.5 rounded-[2px] text-net-grey uppercase shrink-0"
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
      {label}:{" "}
      <span className="text-court-white font-medium">{value}</span>
    </span>
  );
}
