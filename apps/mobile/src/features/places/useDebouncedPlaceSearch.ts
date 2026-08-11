import { useEffect, useMemo, useState } from "react";
import { usePlaceSearch } from "./usePlaceSearch";

const minimumPlaceSearchLength = 2;
const defaultPlaceSearchDebounceMs = 300;

interface UseDebouncedPlaceSearchParams {
  debounceMs?: number;
  enabled?: boolean;
  lat: number;
  limit?: number;
  lng: number;
  query: string;
  radiusM: number;
}

export function useDebouncedPlaceSearch({
  debounceMs = defaultPlaceSearchDebounceMs,
  enabled = true,
  lat,
  limit = 5,
  lng,
  query,
  radiusM,
}: UseDebouncedPlaceSearchParams) {
  const normalizedQuery = useMemo(() => normalizePlaceSearchQuery(query), [query]);
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || normalizedQuery.length < minimumPlaceSearchLength) {
      setDebouncedQuery(null);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [debounceMs, enabled, normalizedQuery]);

  const searchParams = useMemo(
    () =>
      debouncedQuery
        ? {
            query: debouncedQuery,
            lat,
            lng,
            radiusM,
            limit,
          }
        : null,
    [debouncedQuery, lat, limit, lng, radiusM],
  );
  const queryResult = usePlaceSearch(searchParams);
  const results = queryResult.data ?? [];
  const isDebouncing = Boolean(
    enabled &&
      normalizedQuery.length >= minimumPlaceSearchLength &&
      normalizedQuery !== debouncedQuery,
  );

  return {
    ...queryResult,
    debouncedQuery,
    isPending: isDebouncing || queryResult.isFetching,
    results,
    showEmpty: Boolean(
      debouncedQuery &&
        !queryResult.isFetching &&
        !queryResult.isError &&
        results.length === 0,
    ),
  };
}

function normalizePlaceSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}
