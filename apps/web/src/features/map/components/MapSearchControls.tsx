import { Search } from "lucide-react";
import type { Ref } from "react";

import type { KakaoKeywordSearchResult } from "../../../shared/map/kakaoMapLoader";
import { cn } from "../../../shared/ui/cn";

type MapSearchControlsVariant = "mobile" | "desktop";

export interface MapSearchControlsProps {
  inputRef?: Ref<HTMLInputElement>;
  isPlaceSearching: boolean;
  onQueryChange: (value: string) => void;
  onSelectPlace: (place: KakaoKeywordSearchResult) => void;
  onSubmit: () => void | Promise<void>;
  places: KakaoKeywordSearchResult[];
  query: string;
  searchError: string | null;
  variant: MapSearchControlsVariant;
}

export function MapSearchControls({
  inputRef,
  isPlaceSearching,
  onQueryChange,
  onSelectPlace,
  onSubmit,
  places,
  query,
  searchError,
  variant,
}: MapSearchControlsProps) {
  const isMobile = variant === "mobile";

  return (
    <>
      <form
        className={cn(
          "relative grid min-h-12 w-full grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-hypo-lg px-3",
          isMobile
            ? "border border-hypo-border bg-hypo-surface"
            : "border border-hypo-border bg-hypo-bg",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Search className="justify-self-center text-hypo-text-soft" size={17} />
        <input
          ref={inputRef}
          className="min-w-0 bg-transparent text-sm font-semibold leading-5 text-hypo-text outline-none placeholder:text-hypo-text-soft/60"
          enterKeyHint="search"
          placeholder="지역, 역, 학교 검색"
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </form>

      {searchError ? (
        <p
          className={cn(
            "px-3 py-2 text-xs font-bold leading-4 text-hypo-danger",
            isMobile
              ? "rounded-hypo-md border border-hypo-border bg-hypo-surface"
              : "rounded-hypo-md bg-hypo-danger-soft",
          )}
        >
          {searchError}
        </p>
      ) : null}

      {isPlaceSearching ? (
        <p
          className={cn(
            "px-3 py-2 text-[11px] font-black text-hypo-brand",
            isMobile
              ? "rounded-hypo-pill border border-hypo-border bg-hypo-surface"
              : "rounded-hypo-pill bg-hypo-brand-soft",
          )}
        >
          지역을 찾고 있어요
        </p>
      ) : null}

      {places.length ? (
        <div
          className={cn(
            "grid gap-1.5 rounded-hypo-lg border p-2",
            isMobile
              ? "border-hypo-border bg-hypo-surface"
              : "border-hypo-border bg-hypo-bg",
          )}
        >
          {places.map((place) => (
            <button
              key={`${place.place_name}-${place.x}-${place.y}`}
              className="rounded-hypo-md px-3 py-2 text-left transition-colors hover:bg-hypo-brand-soft"
              type="button"
              onClick={() => onSelectPlace(place)}
            >
              <span className="block truncate text-sm font-black text-hypo-text">
                {place.place_name ?? "검색 지역"}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-hypo-text-muted">
                {place.road_address_name || place.address_name || "좌표로 이동합니다."}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
