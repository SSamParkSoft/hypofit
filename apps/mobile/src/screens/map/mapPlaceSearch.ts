import type { PlaceSearchResult } from "@/features/places/placesApi";

export function isStrongPlaceMatch(query: string, place: PlaceSearchResult) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(place.name);

  return normalizedName === normalizedQuery || normalizedName.startsWith(normalizedQuery);
}

function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
