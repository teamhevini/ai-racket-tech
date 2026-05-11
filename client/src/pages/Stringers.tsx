import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Navigation } from 'lucide-react';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
}

export default function Stringers() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState('');

  const { data: results = [], isLoading, isFetching } = useQuery<PlaceResult[]>({
    queryKey: ['stringers', search, location],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('query', search);
      if (location) {
        params.set('lat', String(location.lat));
        params.set('lng', String(location.lng));
      }
      const res = await fetch(`/api/stringers/search?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!(search || location),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setSearch('near me');
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  function handleSearch() {
    setSearch(query);
  }

  return (
    <div className="min-h-screen bg-court-black pt-16">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-1">Find a stringer.</h1>
          <p className="text-net-grey text-sm">Local pros who know what they're doing.</p>
        </div>

        {/* Search controls */}
        <div className="space-y-3 mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="City, postcode, or name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-hevini-red hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <Navigation size={12} />
            {locating ? 'Locating...' : 'Use my location'}
          </button>
        </div>

        {/* Results */}
        {(isLoading || isFetching) && (
          <p className="text-net-grey text-sm animate-pulse">Searching...</p>
        )}

        {!isLoading && !isFetching && search && results.length === 0 && (
          <p className="text-net-grey text-sm">No stringers found. Try a different location.</p>
        )}

        {!search && !location && (
          <div className="border border-dashed border-[#222] p-10 text-center" style={{ borderRadius: '2px' }}>
            <MapPin size={24} className="text-net-grey mx-auto mb-3" />
            <p className="text-net-grey text-sm">Enter a location or use your GPS to find nearby stringers.</p>
          </div>
        )}

        <div className="space-y-3">
          {results.map((place, i) => (
            <motion.div
              key={place.place_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border border-border bg-[#111] p-4"
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-white leading-snug">{place.name}</p>
                {place.opening_hours?.open_now !== undefined && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${place.opening_hours.open_now ? 'text-green-400 bg-green-900/20 border border-green-600/40' : 'text-net-grey bg-[#1a1a1a] border border-[#2a2a2a]'}`}
                    style={{ borderRadius: '2px' }}
                  >
                    {place.opening_hours.open_now ? 'Open' : 'Closed'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-net-grey mb-2 flex items-start gap-1">
                <MapPin size={11} className="flex-shrink-0 mt-0.5" /> {place.formatted_address}
              </p>
              {place.rating && (
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] text-net-grey">
                    {place.rating.toFixed(1)} ({place.user_ratings_total?.toLocaleString()} reviews)
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
