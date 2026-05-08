import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useSearchRackets } from "@/hooks/use-rackets";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Rackets() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { data: rackets, isLoading } = useSearchRackets(debouncedQuery);

  return (
    <div className="min-h-screen bg-court-black text-court-white py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-10">
          <h1 className="font-display font-black text-4xl mb-2" style={{ letterSpacing: "0.04em" }}>
            RACKET DATABASE
          </h1>
          <p className="text-net-grey text-sm">Search our database of 80+ rackets with full specs.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand or model..."
            className="w-full h-12 bg-[#111] border border-[#2A2A2A] rounded-[2px] pl-11 pr-4 text-sm text-court-white placeholder:text-net-grey focus:outline-none focus:border-hevini-red"
          />
        </div>

        {/* Results */}
        {isLoading && (
          <div className="text-net-grey text-sm text-center py-12 animate-pulse">Searching...</div>
        )}

        {!isLoading && query.length < 2 && (
          <div className="text-net-grey text-sm text-center py-12">
            Type at least 2 characters to search
          </div>
        )}

        {!isLoading && rackets && rackets.length === 0 && query.length >= 2 && (
          <div className="text-net-grey text-sm text-center py-12">No rackets found for "{query}"</div>
        )}

        <div className="grid gap-3">
          {rackets?.map((racket) => (
            <motion.div
              key={racket.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#111] border rounded-[4px] p-5 flex items-center justify-between ${
                racket.brand === "Hevini" ? "border-hevini-red/40" : "border-[#1E1E1E]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-court-white">
                    {racket.brand} {racket.model}
                  </span>
                  {racket.brand === "Hevini" && (
                    <span className="bg-hevini-red text-white text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm">
                      Featured
                    </span>
                  )}
                </div>
                <div className="text-net-grey text-xs space-x-3">
                  {racket.headSize && <span>{racket.headSize} sq in</span>}
                  {racket.stringPattern && <span>{racket.stringPattern}</span>}
                  {racket.weightUnstrung && <span>{racket.weightUnstrung}g</span>}
                  {racket.stiffnessRa && <span>RA {racket.stiffnessRa}</span>}
                </div>
              </div>
              <Link href={`/onboarding`}>
                <Button
                  size="sm"
                  className="bg-hevini-red hover:bg-hevini-red-dark text-white border-0 rounded-[2px] text-xs"
                >
                  Use This
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
