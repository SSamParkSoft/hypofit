import { useQuery } from "@tanstack/react-query";
import { placesApi, type SearchPlacesParams } from "@/features/places/placesApi";

export function usePlaceSearch(params: SearchPlacesParams | null) {
  return useQuery({
    enabled: Boolean(params?.query.trim()),
    queryKey: ["places", params, "api"],
    queryFn: ({ signal }) => placesApi.search(params as SearchPlacesParams, signal),
    retry: false,
    staleTime: 60_000,
  });
}
