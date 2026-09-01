import { useQueryClient } from "@tanstack/react-query";
import { List } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../features/auth/useAuth";
import { KakaoMapCanvas } from "../features/map/components/KakaoMapCanvas";
import { MapLocationButton } from "../features/map/components/MapLocationButton";
import { MobileMapSheet } from "../features/map/components/MobileMapSheet";
import { SelectedFloatingMapCard } from "../features/map/components/MapPostCards";
import { MapResultsPanel } from "../features/map/components/MapResultsPanel";
import { MapSearchControls } from "../features/map/components/MapSearchControls";
import {
  buildMapPostViews,
  defaultRadiusM,
  defaultSearchCenter,
  isKoreaCoordinate,
  isSameMapSearch,
  mapSearchDebounceMs,
  sheetMinHeightPx,
  type LocationStatus,
  type MapFilter,
  type MapViewportSearch,
  type SearchCenter,
  type SheetLevel,
} from "../features/map/model/mapPageModel";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "../features/interview-posts/useInterviewPostViews";
import {
  interviewPostQueryKeys,
  useInterviewPosts,
} from "../features/interview-posts/useInterviewPosts";
import type { KakaoKeywordSearchResult } from "../shared/map/kakaoMapLoader";
import { loadKakaoMaps } from "../shared/map/kakaoMapLoader";
import { cn } from "../shared/ui/cn";
import { getWorkspaceRegionClassName } from "../shared/ui/workspace";

export function MapPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const mapSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<MapFilter>("all");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [currentLocation, setCurrentLocation] = useState<SearchCenter | null>(null);
  const [searchCenter, setSearchCenter] = useState<SearchCenter | null>(defaultSearchCenter);
  const [radiusM, setRadiusM] = useState(defaultRadiusM);
  const [pendingMapSearch, setPendingMapSearch] = useState<{
    lat: number;
    lng: number;
    radiusM: number;
  } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sheetLevel, setSheetLevel] = useState<SheetLevel>("collapsed");
  const [sheetOffsetPx, setSheetOffsetPx] = useState(sheetMinHeightPx);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapPlaceResults, setMapPlaceResults] = useState<KakaoKeywordSearchResult[]>([]);
  const [isMapPlaceSearching, setIsMapPlaceSearching] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);

  const interviewPostParams = useMemo(
    () =>
      searchCenter
        ? {
            status: "open" as const,
            lat: searchCenter.lat,
            lng: searchCenter.lng,
            radiusM,
            sort: "distance" as const,
          }
        : { status: "open" as const },
    [radiusM, searchCenter],
  );
  const {
    data: posts = [],
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
  } = useInterviewPosts(interviewPostParams);
  const { data: postViews = [] } = useInterviewPostViews(accessToken);
  const { mutate: markPostViewed } = useMarkInterviewPostViewed(accessToken);

  const requestCurrentLocation = () => {
    setPendingMapSearch(null);

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      setCurrentLocation(null);
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus("granted");
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "current" as const,
        };
        const isSupportedLocation = isKoreaCoordinate(nextCenter);
        setCurrentLocation(isSupportedLocation ? nextCenter : null);
        setSearchCenter(isSupportedLocation ? nextCenter : defaultSearchCenter);
        setRadiusM(defaultRadiusM);
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setCurrentLocation(null);
        setSearchCenter(defaultSearchCenter);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  };

  useEffect(() => {
    if (!pendingMapSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSearchCenter({
        lat: pendingMapSearch.lat,
        lng: pendingMapSearch.lng,
        source: "map",
      });
      setRadiusM(pendingMapSearch.radiusM);
      setPendingMapSearch(null);
      setSelectedPostId(null);
    }, mapSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [pendingMapSearch]);

  const mapPosts = useMemo(() => buildMapPostViews(posts, activeFilter), [activeFilter, posts]);
  const selectedView = mapPosts.find((view) => view.post.id === selectedPostId) ?? null;
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );

  const selectMapPost = useCallback((postId: string) => {
    setPendingMapSearch(null);
    if (accessToken) {
      markPostViewed({ postId, source: "map" });
    }
    setSelectedPostId(postId);
  }, [accessToken, markPostViewed]);

  const handleMapViewportChange = useCallback(
    (viewport: MapViewportSearch) => {
      if (selectedPostId) {
        return;
      }

      const nextSearch = isSameMapSearch(searchCenter, radiusM, viewport) ? null : viewport;
      setPendingMapSearch(nextSearch);

      if (nextSearch) {
        void queryClient.cancelQueries(
          {
            exact: true,
            queryKey: interviewPostQueryKeys.list(interviewPostParams),
            type: "active",
          },
          { silent: true },
        );
      }
    },
    [interviewPostParams, queryClient, radiusM, searchCenter, selectedPostId],
  );

  const handleMapMarkerSelect = useCallback((postId: string) => {
    selectMapPost(postId);
    setSheetLevel("collapsed");
  }, [selectMapPost]);

  async function searchMapPlaces() {
    const query = mapSearchQuery.trim();

    if (!query) {
      setMapSearchError("검색할 지역을 입력하세요.");
      setMapPlaceResults([]);
      return;
    }

    const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;

    if (!appKey) {
      setMapSearchError("지도 검색 설정을 확인하세요.");
      setMapPlaceResults([]);
      return;
    }

    setIsMapPlaceSearching(true);
    setMapSearchError(null);

    try {
      const kakaoMaps = await loadKakaoMaps(appKey);
      const places = new kakaoMaps.maps.services.Places();
      places.keywordSearch(query, (results, status) => {
        setIsMapPlaceSearching(false);

        if (status !== kakaoMaps.maps.services.Status.OK || !results.length) {
          setMapPlaceResults([]);
          setMapSearchError("검색 결과가 없어요. 역, 학교, 동네 이름으로 다시 찾아보세요.");
          return;
        }

        setMapPlaceResults(results.slice(0, 5));
      });
    } catch {
      setIsMapPlaceSearching(false);
      setMapPlaceResults([]);
      setMapSearchError("지역 검색을 불러오지 못했어요.");
    }
  }

  function selectMapPlace(place: KakaoKeywordSearchResult) {
    const lat = Number(place.y);
    const lng = Number(place.x);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMapSearchError("선택한 지역의 위치를 확인하지 못했어요.");
      return;
    }

    setMapSearchQuery(place.place_name ?? mapSearchQuery.trim());
    setMapPlaceResults([]);
    setMapSearchError(null);
    setSelectedPostId(null);
    setPendingMapSearch(null);
    setSearchCenter({ lat, lng, source: "map" });
    setRadiusM(defaultRadiusM);
    mapSearchInputRef.current?.blur();
  }

  const sharedSearchControlProps = {
    isPlaceSearching: isMapPlaceSearching,
    onQueryChange: (value: string) => {
      setMapSearchQuery(value);
      setMapSearchError(null);
    },
    onSelectPlace: selectMapPlace,
    onSubmit: searchMapPlaces,
    places: mapPlaceResults,
    query: mapSearchQuery,
    searchError: mapSearchError,
  };
  const mobileSearchControlProps = {
    ...sharedSearchControlProps,
    onSubmit: async () => {
      mapSearchInputRef.current?.blur();
      await searchMapPlaces();
    },
  };
  const isRefreshingResults =
    pendingMapSearch !== null || (!isLoading && (isFetching || isPlaceholderData));

  return (
    <div className="mx-auto h-[var(--app-shell-content-height)] w-full max-w-none overflow-hidden bg-hypo-bg min-[1200px]:h-full min-[1200px]:px-6 min-[1200px]:py-5">
      <div
        className={cn(
          "grid h-full w-full min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(380px,420px)] min-[1200px]:rounded-hypo-lg min-[1200px]:border min-[1200px]:border-hypo-border",
          getWorkspaceRegionClassName({ height: "framedDesktop", scroll: "clip" }),
        )}
      >
        <section className="relative h-full min-h-0 overflow-hidden bg-[#edf1ec]">
          <KakaoMapCanvas
            currentLocation={currentLocation}
            searchCenter={searchCenter}
            selectedPostId={selectedPostId}
            viewedPostIds={viewedPostIds}
            views={mapPosts}
            onMapViewportChange={handleMapViewportChange}
            onSelect={handleMapMarkerSelect}
          />

          <header className="absolute left-[max(16px,env(safe-area-inset-left))] right-[max(16px,env(safe-area-inset-right))] top-[calc(var(--app-safe-top)+0.75rem)] z-20 grid gap-2.5 sm:left-5 sm:right-auto sm:w-[390px] sm:max-w-[calc(100%-2.5rem)] md:top-3 min-[1200px]:hidden">
            <MapSearchControls
              {...mobileSearchControlProps}
              inputRef={mapSearchInputRef}
              variant="mobile"
            />
          </header>

          <div
            style={
              {
                "--map-location-button-bottom": `${sheetOffsetPx + 8}px`,
              } as CSSProperties
            }
            className={cn(
              "absolute right-[max(12px,env(safe-area-inset-right))] z-30 min-[1200px]:bottom-4 min-[1200px]:right-4 min-[1200px]:top-auto min-[1200px]:block",
              selectedView || sheetLevel === "expanded"
                ? "hidden"
                : "bottom-[var(--map-location-button-bottom)] block",
            )}
          >
            <MapLocationButton
              isRequesting={locationStatus === "requesting"}
              onClick={requestCurrentLocation}
            />
          </div>

          {selectedView ? (
            <div
              style={
                {
                  "--map-selected-card-bottom": `${sheetMinHeightPx + 12}px`,
                } as CSSProperties
              }
              className="absolute inset-x-3 bottom-[var(--map-selected-card-bottom)] z-30 min-[1200px]:hidden"
            >
              <SelectedFloatingMapCard view={selectedView} onClose={() => setSelectedPostId(null)} />
            </div>
          ) : null}

          {mapPosts.length > 0 && !selectedView && sheetLevel !== "expanded" ? (
            <button
              style={
                {
                  "--map-list-button-bottom": `${sheetOffsetPx + 8}px`,
                } as CSSProperties
              }
              className="absolute bottom-[var(--map-list-button-bottom)] left-3 z-30 inline-flex h-10 items-center gap-1.5 rounded-hypo-pill border border-hypo-border bg-hypo-surface px-3 text-xs font-black text-hypo-text transition-[bottom,background-color,color,border-color] hover:border-hypo-brand/30 hover:bg-hypo-brand-soft hover:text-hypo-brand min-[1200px]:hidden"
              type="button"
              onClick={() => {
                setSelectedPostId(null);
                setSheetLevel("mid");
              }}
            >
              <List size={15} />
              목록
            </button>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-20 min-[1200px]:hidden">
            <MobileMapSheet
              activeFilter={activeFilter}
              isError={isError}
              isLoading={isLoading}
              isRefreshing={isRefreshingResults}
              locationStatus={locationStatus}
              searchCenter={searchCenter}
              sheetLevel={sheetLevel}
              viewedPostIds={viewedPostIds}
              views={mapPosts}
              onFilterChange={(filter) => {
                setActiveFilter(filter);
                setSelectedPostId(null);
              }}
              onSelect={(postId) => {
                selectMapPost(postId);
                setSheetLevel("collapsed");
              }}
              onSheetHeightChange={setSheetOffsetPx}
              onSheetLevelChange={setSheetLevel}
            />
          </div>
        </section>

        <MapResultsPanel
          activeFilter={activeFilter}
          isError={isError}
          isLoading={isLoading}
          isRefreshing={isRefreshingResults}
          locationStatus={locationStatus}
          searchCenter={searchCenter}
          searchControls={<MapSearchControls {...sharedSearchControlProps} variant="desktop" />}
          selectedView={selectedView}
          viewedPostIds={viewedPostIds}
          views={mapPosts}
          onFilterChange={(filter) => {
            setActiveFilter(filter);
            setSelectedPostId(null);
          }}
          onSelect={selectMapPost}
        />
      </div>
    </div>
  );
}
