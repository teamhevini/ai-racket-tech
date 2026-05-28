import { useState } from "react";
import { Search, MapPin, Phone, Globe, Lock, Navigation, Bookmark } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStringers } from "@/hooks/use-stringers";
import { useUser } from "@/contexts/UserContext";
import type { Stringer } from "@shared/routes";

const FREE_LIMIT = 3;

export default function Stringers() {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [locating, setLocating] = useState(false);

  const { canViewAllStringers, isAdmin } = useUser();

  const { data: results = [], isLoading } = useStringers({
    query,
    lat: coords?.lat,
    lng: coords?.lng,
  });

  const visibleResults = canViewAllStringers ? results : results.slice(0, FREE_LIMIT);
  const hiddenCount = results.length - visibleResults.length;

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        });
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  const hasSearch = !!query || !!coords;

  return (
    <div className="min-h-screen bg-court-black text-court-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10">
          <h1
            className="font-display font-black text-4xl md:text-5xl text-court-white mb-3 uppercase"
            style={{ letterSpacing: "0.04em" }}
          >
            Find a Stringer
          </h1>
          <p className="text-net-grey text-sm">
            Search by city or use your location to find local stringers.
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-net-grey" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCoords(null); }}
              placeholder="City or zip code..."
              className="pl-9 bg-[#111] border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-hevini-red rounded-[2px] h-11"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4 rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white"
            onClick={handleLocate}
            disabled={locating}
          >
            <Navigation className={`w-4 h-4 ${locating ? "animate-pulse" : ""}`} />
          </Button>
        </div>

        {coords && !query && (
          <p className="text-xs text-hevini-red mb-4 font-bold">
            Using your location — showing nearby stringers
          </p>
        )}

        {isLoading && (
          <div className="text-net-grey text-sm text-center py-12">Searching...</div>
        )}

        {!isLoading && hasSearch && results.length === 0 && (
          <div className="text-net-grey text-sm text-center py-12">
            No stringers found in this area.
          </div>
        )}

        {!hasSearch && (
          <div className="text-net-grey text-sm text-center py-12">
            Enter a location or use GPS to find nearby stringers.
          </div>
        )}

        {visibleResults.length > 0 && (
          <div className="space-y-3 mb-4">
            {visibleResults.map((s) => (
              <StringerCard key={s.place_id} stringer={s} />
            ))}
          </div>
        )}

        {hiddenCount > 0 && !isAdmin && (
          <div className="bg-[#111] border border-[#1E1E1E] rounded-[4px] p-6 text-center">
            <Lock className="w-6 h-6 text-hevini-red mx-auto mb-3" />
            <p className="text-court-white font-bold text-sm mb-1">
              {hiddenCount} more stringer{hiddenCount !== 1 ? "s" : ""} nearby
            </p>
            <p className="text-net-grey text-xs mb-4">
              Upgrade to Pro to see all stringer results.
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

function StringerCard({ stringer }: { stringer: Stringer }) {
  const { email } = useUser();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!email) { window.location.href = "/login"; return; }
    setSaving(true);
    const res = await fetch("/api/account/stringers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stringerName: stringer.name, stringerAddress: stringer.address, stringerPlaceId: stringer.place_id }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="bg-[#111] border border-[#1E1E1E] hover:border-[#333] rounded-[4px] p-4 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-court-white font-bold text-sm">{stringer.name}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saved || saving}
          className="h-7 px-2.5 rounded-[2px] border-[#333] text-net-grey hover:border-hevini-red hover:text-hevini-red text-[10px] font-bold uppercase shrink-0"
          style={{ letterSpacing: "0.08em" }}
        >
          <Bookmark className={`w-3 h-3 mr-1 ${saved ? "fill-hevini-red text-hevini-red" : ""}`} />
          {saved ? "SAVED" : "SAVE"}
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-start gap-2 text-xs text-net-grey">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{stringer.address}</span>
        </div>
        {stringer.phone && (
          <div className="flex items-center gap-2 text-xs text-net-grey">
            <Phone className="w-3 h-3 shrink-0" />
            <a href={`tel:${stringer.phone}`} className="hover:text-court-white transition-colors">
              {stringer.phone}
            </a>
          </div>
        )}
        {stringer.website && (
          <div className="flex items-center gap-2 text-xs text-net-grey">
            <Globe className="w-3 h-3 shrink-0" />
            <a
              href={stringer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-court-white transition-colors truncate"
            >
              {stringer.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
