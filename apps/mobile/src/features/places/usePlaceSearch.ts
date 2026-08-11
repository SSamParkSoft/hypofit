import { useQuery } from "@tanstack/react-query";
import { placesApi, type SearchPlacesParams } from "@/shared/api/places";

export function usePlaceSearch(params: SearchPlacesParams | null) {
  return useQuery({
    enabled: Boolean(params?.query.trim()),
    queryKey: ["places", params, "api"],
    queryFn: () => placesApi.search(params as SearchPlacesParams),
    retry: false,
    staleTime: 60_000,
  });
}
