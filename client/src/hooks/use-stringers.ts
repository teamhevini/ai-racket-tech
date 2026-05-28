import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface StringerSearchParams {
  query: string;
  lat?: string;
  lng?: string;
}

export function useStringers(params: StringerSearchParams) {
  const hasCoords = !!params.lat && !!params.lng;
  const hasQuery = !!params.query && params.query.length >= 3;

  return useQuery({
    queryKey: [api.stringers.search.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append("query", params.query);
      if (params.lat) searchParams.append("lat", params.lat);
      if (params.lng) searchParams.append("lng", params.lng);
      const url = `${api.stringers.search.path}?${searchParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search stringers");
      return api.stringers.search.responses[200].parse(await res.json());
    },
    enabled: hasQuery || hasCoords,
    staleTime: 1000 * 60 * 15,
  });
}
