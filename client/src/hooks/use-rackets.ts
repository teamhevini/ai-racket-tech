import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSearchRackets(query: string) {
  return useQuery({
    queryKey: [api.rackets.search.path, query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const url = `${api.rackets.search.path}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search rackets");
      return api.rackets.search.responses[200].parse(await res.json());
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
}

export function useRacket(id: number | null) {
  return useQuery({
    queryKey: [api.rackets.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.rackets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch racket");
      return api.rackets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
