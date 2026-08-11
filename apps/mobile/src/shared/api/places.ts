import type { LocationSource } from "@hypofit/contracts";
import { apiGet } from "./client";

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string | null;
  road_address: string | null;
  category: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  source: Extract<LocationSource, "kakao_place">;
}

export interface SearchPlacesParams {
  query: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
  limit?: number;
}

export function searchPlaces(params: SearchPlacesParams) {
  const searchParams = new URLSearchParams({ query: params.query });
  if (params.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params.lng !== undefined) searchParams.set("lng", String(params.lng));
  if (params.radiusM !== undefined) searchParams.set("radius_m", String(params.radiusM));
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

  return apiGet<PlaceSearchResult[]>(`/api/v1/places/search?${searchParams.toString()}`);
}

export const placesApi = {
  search: searchPlaces,
} as const;
