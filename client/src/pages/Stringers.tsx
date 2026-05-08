import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, ExternalLink, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStringers } from "@/hooks/use-stringers";

export default function Stringers() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stringers, isLoading } = useStringers({ query: searchQuery });

  const handleSearch = () => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-court-black text-court-white py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-10">
          <h1 className="font-display font-black text-4xl mb-2" style={{ letterSpacing: "0.04em" }}>
            FIND A STRINGER
          </h1>
          <p className="text-net-grey text-sm">Locate tennis shops and stringers near you.</p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="City, zip code, or location..."
              className="w-full h-12 bg-[#111] border border-[#2A2A2A] rounded-[2px] pl-11 pr-4 text-sm text-court-white placeholder:text-net-grey focus:outline-none focus:border-hevini-red"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="h-12 px-6 bg-hevini-red hover:bg-hevini-red-dark text-white border-0 rounded-[2px] font-bold uppercase text-xs"
            style={{ letterSpacing: "0.1em" }}
          >
            Search
          </Button>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="text-net-grey text-sm text-center py-12 animate-pulse">Searching nearby...</div>
        )}

        {!isLoading && !searchQuery && (
          <div className="text-net-grey text-sm text-center py-12">
            Enter a location to find stringers near you
          </div>
        )}

        {!isLoading && searchQuery && stringers?.length === 0 && (
          <div className="text-net-grey text-sm text-center py-12">
            No stringers found near "{searchQuery}". Try a different location.
          </div>
        )}

        <div className="grid gap-3">
          {stringers?.map((stringer, i) => (
            <motion.div
              key={stringer.place_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-court-white mb-1">{stringer.name}</h3>
                  {stringer.address && (
                    <div className="flex items-start gap-1.5 text-net-grey text-xs">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{stringer.address}</span>
                    </div>
                  )}
                  {stringer.phone && (
                    <div className="flex items-center gap-1.5 text-net-grey text-xs mt-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{stringer.phone}</span>
                    </div>
                  )}
                </div>
                {stringer.website && (
                  <a
                    href={stringer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hevini-red hover:text-hevini-red-dark shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
