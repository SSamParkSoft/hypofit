import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Keyboard,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import MapView, { Marker, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { InterviewMode, InterviewPost } from "@hypofit/contracts";
import { interviewModeLabels } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInterviewPostViews, useMarkInterviewPostViewed } from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { useDebouncedPlaceSearch } from "@/features/places/useDebouncedPlaceSearch";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { PlaceSearchResult } from "@/shared/api/places";
import {
  getPostingCompensationLabel,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/shared/format/postings";
import { ListRow } from "@/shared/ui/ListSurface";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { SearchField } from "@/shared/ui/SearchField";
import { getBottomTabBarHeight } from "@/shared/navigation/tabBarStyle";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";
import {
  clampMapSheetHeight,
  formatMapDistance,
  getCycleMapSheetLevel,
  getHigherMapSheetLevel,
  getLowerMapSheetLevel,
  getMapSheetHeights,
  getNearestMapSheetLevel,
  type MapSheetLevel,
} from "./mapSheet";
import { subscribeMapTabReselect } from "./mapTabEvents";

const defaultRegion: Region = {
  latitude: 37.296513,
  longitude: 126.83708,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const minimumMapRadiusM = 800;
const maximumMapRadiusM = 20000;
const minimumSearchAreaMoveM = 250;
const currentLocationTimeoutMs = 7_000;
const markerPressMapTapGuardMs = 350;
const sheetTapThresholdPx = 6;

type MapModeFilter = "all" | Extract<InterviewMode, "offline" | "both">;
const mapModeFilters: Array<{ label: string; value: MapModeFilter }> = [
  { label: "전체", value: "all" },
  { label: "대면", value: "offline" },
  { label: "대면/화상", value: "both" },
];

type LocationState = "checking" | "requesting" | "granted" | "denied" | "unavailable";
type InterviewPostWithCoordinates = InterviewPost & { location_latitude: number; location_longitude: number };
type MapMarkerItem =
  | {
      id: string;
      latitude: number;
      longitude: number;
      post: InterviewPostWithCoordinates;
      type: "single";
    }
  | {
      id: string;
      latitude: number;
      longitude: number;
      posts: InterviewPostWithCoordinates[];
      type: "group";
    };

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getBottomTabBarHeight(insets.bottom);
  const { accessToken, appUser } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [region, setRegion] = useState(defaultRegion);
  const [queryRegion, setQueryRegion] = useState(defaultRegion);
  const [locationState, setLocationState] = useState<LocationState>("checking");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedMarkerGroupId, setSelectedMarkerGroupId] = useState<string | null>(null);
  const [isSearchAreaDirty, setIsSearchAreaDirty] = useState(false);
  const [sheetLevel, setSheetLevel] = useState<MapSheetLevel>("min");
  const [containerHeight, setContainerHeight] = useState(0);
  const [stableMapPosts, setStableMapPosts] = useState<InterviewPostWithCoordinates[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);
  const [mapModeFilter, setMapModeFilter] = useState<MapModeFilter>("all");
  const mapRef = useRef<MapView | null>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const isLocationRequestInFlightRef = useRef(false);
  const shouldRetryLocationOnActiveRef = useRef(false);
  const dragStartHeightRef = useRef(0);
  const didDragRef = useRef(false);
  const ignoreMapPressUntilRef = useRef(0);
  const suppressNextSearchAreaDirtyRef = useRef(false);
  const animatedSheetHeight = useRef(new Animated.Value(getMapSheetHeights(windowHeight).min)).current;
  const queryRadiusM = useMemo(() => getRegionSearchRadiusM(queryRegion), [queryRegion]);

  const { data: posts = [], isError, isFetching, isLoading, refetch: refetchPosts } = useInterviewPosts({
    status: "open",
    ...(mapModeFilter === "all" ? {} : { mode: mapModeFilter }),
    lat: queryRegion.latitude,
    lng: queryRegion.longitude,
    limit: 100,
    radiusM: queryRadiusM,
    sort: "distance",
  });
  const { data: postViews = [] } = useInterviewPostViews(accessToken);
  const markViewed = useMarkInterviewPostViewed(accessToken);
  const placeSearch = useDebouncedPlaceSearch({
    enabled: isPlaceDropdownOpen,
    query: mapSearchQuery,
    lat: queryRegion.latitude,
    lng: queryRegion.longitude,
    limit: 5,
  });
  const placeResults = placeSearch.results;

  const applyDeviceLocation = useCallback((location: Location.LocationObject, source: "current" | "last_known") => {
    if (!isMountedRef.current) {
      return;
    }

    const nextRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setRegion((previous) => ({
      ...previous,
      ...nextRegion,
    }));
    setQueryRegion((previous) => ({ ...previous, ...nextRegion }));
    setIsSearchAreaDirty(false);
    setLocationState("granted");
    shouldRetryLocationOnActiveRef.current = false;
    addAppBreadcrumb("map_location_resolved", {
      accuracy: typeof location.coords.accuracy === "number" ? Math.round(location.coords.accuracy) : null,
      phase: "map_location",
      platform: Platform.OS,
      source,
    });
  }, []);

  const readCurrentLocation = useCallback(async () => {
    addAppBreadcrumb("map_location_current_position_start", {
      phase: "map_location",
      platform: Platform.OS,
    });

    try {
      const current = await withLocationTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        currentLocationTimeoutMs,
      );
      applyDeviceLocation(current, "current");
      return;
    } catch (error) {
      addAppBreadcrumb("map_location_current_position_failed", {
        phase: "map_location",
        platform: Platform.OS,
        source: "current",
      });
      captureAppError(error, {
        code: "map_current_location_failed",
        phase: "map_location",
        platform: Platform.OS,
        source: "current",
      });
    }

    addAppBreadcrumb("map_location_last_known_start", {
      phase: "map_location",
      platform: Platform.OS,
    });

    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        applyDeviceLocation(lastKnown, "last_known");
        return;
      }

      addAppBreadcrumb("map_location_last_known_empty", {
        phase: "map_location",
        platform: Platform.OS,
        source: "last_known",
      });
    } catch (error) {
      captureAppError(error, {
        code: "map_last_known_location_failed",
        phase: "map_location",
        platform: Platform.OS,
        source: "last_known",
      });
    }

    if (isMountedRef.current) {
      shouldRetryLocationOnActiveRef.current = true;
      setLocationState("unavailable");
      addAppBreadcrumb("map_location_unavailable", {
        phase: "map_location",
        platform: Platform.OS,
      });
    }
  }, [applyDeviceLocation]);

  const requestCurrentLocation = useCallback(async () => {
    if (isLocationRequestInFlightRef.current) {
      return;
    }

    isLocationRequestInFlightRef.current = true;
    setLocationState("checking");

    try {
      addAppBreadcrumb("map_location_permission_check_start", {
        phase: "map_location",
        platform: Platform.OS,
      });
      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (!isMountedRef.current) {
        return;
      }

      if (existingPermission.status === Location.PermissionStatus.GRANTED) {
        addAppBreadcrumb("map_location_permission_granted", {
          can_ask_again: existingPermission.canAskAgain,
          permission_status: existingPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        await readCurrentLocation();
        return;
      }

      if (existingPermission.status === Location.PermissionStatus.DENIED && !existingPermission.canAskAgain) {
        addAppBreadcrumb("map_location_permission_denied", {
          can_ask_again: existingPermission.canAskAgain,
          permission_status: existingPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        setLocationState("denied");
        shouldRetryLocationOnActiveRef.current = false;
        return;
      }

      setLocationState("requesting");
      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      if (!isMountedRef.current) {
        return;
      }

      if (requestedPermission.status !== Location.PermissionStatus.GRANTED) {
        addAppBreadcrumb("map_location_permission_denied", {
          can_ask_again: requestedPermission.canAskAgain,
          permission_status: requestedPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        setLocationState("denied");
        shouldRetryLocationOnActiveRef.current = false;
        return;
      }

      addAppBreadcrumb("map_location_permission_granted", {
        can_ask_again: requestedPermission.canAskAgain,
        permission_status: requestedPermission.status,
        phase: "map_location",
        platform: Platform.OS,
      });
      await readCurrentLocation();
    } catch (error) {
      captureAppError(error, {
        code: "map_location_permission_or_read_failed",
        phase: "map_location",
        platform: Platform.OS,
      });
      if (isMountedRef.current) {
        shouldRetryLocationOnActiveRef.current = true;
        setLocationState("unavailable");
      }
    } finally {
      isLocationRequestInFlightRef.current = false;
    }
  }, [readCurrentLocation]);

  useEffect(() => {
    isMountedRef.current = true;
    void requestCurrentLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, [requestCurrentLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        shouldRetryLocationOnActiveRef.current &&
        !isLocationRequestInFlightRef.current
      ) {
        shouldRetryLocationOnActiveRef.current = false;
        void requestCurrentLocation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestCurrentLocation]);

  const sheetHeights = useMemo(
    () => getMapSheetHeights(containerHeight > 0 ? containerHeight : windowHeight),
    [containerHeight, windowHeight],
  );

  const mapPosts = useMemo(
    () => posts.filter(isRenderableMapPost),
    [posts],
  );
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
  const displayMapPosts = useMemo(
    () => ((isLoading || isError) && stableMapPosts.length > 0 ? stableMapPosts : mapPosts),
    [isError, isLoading, mapPosts, stableMapPosts],
  );
  const markerItems = useMemo(() => buildMapMarkerItems(displayMapPosts), [displayMapPosts]);
  const selectedPost = useMemo(
    () => displayMapPosts.find((post) => post.id === selectedPostId) ?? null,
    [displayMapPosts, selectedPostId],
  );
  const selectedMarkerGroup = useMemo(
    () =>
      markerItems.find((item): item is Extract<MapMarkerItem, { type: "group" }> => (
        item.type === "group" && item.id === selectedMarkerGroupId
      )) ?? null,
    [markerItems, selectedMarkerGroupId],
  );
  const sheetPosts = selectedMarkerGroup ? selectedMarkerGroup.posts : displayMapPosts;
  useEffect(() => {
    if (!isLoading && !isError) {
      setStableMapPosts(mapPosts);
    }
  }, [isError, isLoading, mapPosts]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (selectedPostId && !displayMapPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(null);
    }

    if (selectedMarkerGroupId && !markerItems.some((item) => item.type === "group" && item.id === selectedMarkerGroupId)) {
      setSelectedMarkerGroupId(null);
    }
  }, [displayMapPosts, isLoading, markerItems, selectedMarkerGroupId, selectedPostId]);

  useEffect(() => {
    Animated.timing(animatedSheetHeight, {
      toValue: sheetHeights[sheetLevel],
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedSheetHeight, sheetHeights, sheetLevel]);

  const resetMapSelection = useCallback(() => {
    setIsPlaceDropdownOpen(false);
    setSelectedPlace(null);
    setSelectedPlaceId(null);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setSheetLevel("min");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);

  useEffect(() => subscribeMapTabReselect(resetMapSelection), [resetMapSelection]);

  const suppressMapPressFromMarker = useCallback(() => {
    ignoreMapPressUntilRef.current = Date.now() + markerPressMapTapGuardMs;
  }, []);

  const clearMapSelectionToNearby = useCallback(() => {
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setSheetLevel("min");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);

  const handleMapPress = useCallback(() => {
    if (Date.now() < ignoreMapPressUntilRef.current) {
      return;
    }

    if (!selectedMarkerGroupId && !selectedPostId && !isPlaceDropdownOpen) {
      if (sheetLevel !== "min") {
        setSheetLevel("min");
        sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
      }
      return;
    }

    clearMapSelectionToNearby();
  }, [clearMapSelectionToNearby, isPlaceDropdownOpen, selectedMarkerGroupId, selectedPostId, sheetLevel]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          didDragRef.current = false;
          animatedSheetHeight.stopAnimation((value) => {
            dragStartHeightRef.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          if (Math.abs(gestureState.dy) > sheetTapThresholdPx) {
            didDragRef.current = true;
          }

          const nextHeight = clampMapSheetHeight(dragStartHeightRef.current - gestureState.dy, sheetHeights);
          animatedSheetHeight.setValue(nextHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const releaseHeight = clampMapSheetHeight(dragStartHeightRef.current - gestureState.dy, sheetHeights);
          const nextLevel = didDragRef.current
            ? gestureState.vy < -0.55
              ? getHigherMapSheetLevel(sheetLevel)
              : gestureState.vy > 0.55
                ? getLowerMapSheetLevel(sheetLevel)
                : getNearestMapSheetLevel(releaseHeight, sheetHeights)
            : getCycleMapSheetLevel(sheetLevel);

          didDragRef.current = false;
          setSheetLevel(nextLevel);
        },
        onPanResponderTerminate: (_, gestureState) => {
          const releaseHeight = clampMapSheetHeight(dragStartHeightRef.current - gestureState.dy, sheetHeights);
          didDragRef.current = false;
          setSheetLevel(getNearestMapSheetLevel(releaseHeight, sheetHeights));
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [animatedSheetHeight, sheetHeights, sheetLevel],
  );

  const focusPostInUsableMapArea = useCallback((post: InterviewPost) => {
    if (!hasMapCoordinates(post)) {
      return;
    }

    const visibleMapHeight = Math.max(1, containerHeight - tabBarHeight);
    const visibleSheetHeight = sheetLevel === "min" ? sheetHeights.mid : sheetHeights[sheetLevel];
    const bottomInsetRatio = visibleSheetHeight / visibleMapHeight;
    const nextRegion = {
      ...region,
      latitude: post.location_latitude - region.latitudeDelta * Math.min(0.28, bottomInsetRatio * 0.34),
      longitude: post.location_longitude,
    };

    suppressNextSearchAreaDirtyRef.current = true;
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 220);
  }, [containerHeight, region, sheetHeights, sheetLevel, tabBarHeight]);

  const selectPost = useCallback((post: InterviewPost, options: { expandSheet?: boolean; focusMap?: boolean } = {}) => {
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(post.id);
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });

    if (options.expandSheet !== false) {
      setSheetLevel((currentLevel) => (currentLevel === "min" ? "mid" : currentLevel));
    }

    if (options.focusMap !== false) {
      focusPostInUsableMapArea(post);
    }

    if (accessToken && !viewedPostIds.has(post.id)) {
      markViewed.mutate({ postId: post.id, source: "map" });
    }
  }, [accessToken, focusPostInUsableMapArea, markViewed, viewedPostIds]);

  const selectMarkerGroup = useCallback((groupId: string) => {
    suppressMapPressFromMarker();

    const group = markerItems.find((item): item is Extract<MapMarkerItem, { type: "group" }> => (
      item.type === "group" && item.id === groupId
    ));

    if (!group) {
      return;
    }

    setIsPlaceDropdownOpen(false);
    setSelectedPostId(null);
    setSelectedMarkerGroupId(group.id);
    setSheetLevel(group.posts.length <= 3 ? "compact" : "mid");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, [markerItems, suppressMapPressFromMarker]);

  const selectPostById = useCallback((postId: string) => {
    suppressMapPressFromMarker();

    const post = displayMapPosts.find((candidate) => candidate.id === postId);
    if (post) {
      selectPost(post);
    }
  }, [displayMapPosts, selectPost, suppressMapPressFromMarker]);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
    setRegion(nextRegion);
    if (suppressNextSearchAreaDirtyRef.current) {
      suppressNextSearchAreaDirtyRef.current = false;
      return;
    }
    setIsSearchAreaDirty(hasMeaningfulRegionChange(nextRegion, queryRegion));
  }, [queryRegion]);

  const submitMapSearch = () => {
    Keyboard.dismiss();

    const query = mapSearchQuery.trim();

    if (query.length < 2) {
      setMapSearchError("지역, 역, 학교 이름을 2자 이상 입력하세요.");
      setIsPlaceDropdownOpen(true);
      return;
    }

    setMapSearchError(null);
    setIsPlaceDropdownOpen(true);

    const firstStrongMatch = placeResults.find((place) => isStrongPlaceMatch(query, place));
    if (firstStrongMatch) {
      selectMapPlace(firstStrongMatch);
    }
  };

  const selectMapPlace = (place: PlaceSearchResult) => {
    Keyboard.dismiss();

    setMapSearchQuery(place.name);
    setSelectedPlace(place);
    setSelectedPlaceId(place.id);
    setIsPlaceDropdownOpen(false);
    setMapSearchError(null);
    setSelectedPostId(null);
    setSelectedMarkerGroupId(null);
    setSheetLevel("min");
    const nextRegion = {
      ...region,
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: Math.min(region.latitudeDelta, 0.035),
      longitudeDelta: Math.min(region.longitudeDelta, 0.035),
    };
    setRegion(nextRegion);
    setQueryRegion(nextRegion);
    setIsSearchAreaDirty(false);
  };

  const searchThisArea = useCallback(() => {
    Keyboard.dismiss();
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setSheetLevel("min");
    setQueryRegion(region);
    setIsSearchAreaDirty(false);
  }, [region]);

  const mapBannerCopy = getMapBannerCopy(locationState, isError, stableMapPosts.length > 0);
  const showBlockingState = displayMapPosts.length === 0;
  const sheetTitle = selectedMarkerGroup ? getMarkerGroupSheetTitle(selectedMarkerGroup) : "근처 공고";
  const sheetCount = selectedMarkerGroup ? selectedMarkerGroup.posts.length : displayMapPosts.length;

  return (
    <View className="flex-1 bg-[#edf1ec]">
      <View className="flex-1" onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}>
        <View className="flex-1 overflow-hidden bg-[#edf1ec]">
          <MapView
            ref={mapRef}
            region={region}
            showsMyLocationButton={false}
            showsUserLocation={locationState === "granted"}
            onPress={handleMapPress}
            onRegionChangeComplete={handleRegionChangeComplete}
            style={{ flex: 1 }}
          >
            {markerItems.map((item) =>
              item.type === "group" ? (
                <NativePostGroupMarker
                  key={`native-post-group-marker-${item.id}`}
                  count={item.posts.length}
                  id={item.id}
                  latitude={item.latitude}
                  longitude={item.longitude}
                  selected={item.id === selectedMarkerGroupId || item.posts.some((post) => post.id === selectedPostId)}
                  onSelect={selectMarkerGroup}
                />
              ) : (
                <NativePostMarker
                  key={`native-post-marker-${item.post.id}`}
                  id={item.post.id}
                  latitude={item.latitude}
                  longitude={item.longitude}
                  compensationLabel={getMapMarkerCompensationLabel(item.post)}
                  selected={item.post.id === selectedPostId}
                  viewed={viewedPostIds.has(item.post.id)}
                  onSelect={selectPostById}
                />
              ),
            )}
            {selectedPlace ? (
              <NativeSearchPlaceMarker
                latitude={selectedPlace.latitude}
                longitude={selectedPlace.longitude}
              />
            ) : null}
          </MapView>

          <View className="absolute left-3 right-3 items-center gap-2" pointerEvents="box-none" style={{ top: insets.top + 122 }}>
            {isSearchAreaDirty ? (
              <Pressable
                accessibilityLabel="이 지역에서 공고 검색"
                accessibilityRole="button"
                className="min-h-10 flex-row items-center gap-1.5 rounded-full border border-hypo-border bg-hypo-surface px-3.5"
                onPress={searchThisArea}
                style={({ pressed }) => ({
                  elevation: 2,
                  opacity: pressed ? 0.82 : 1,
                  shadowColor: "#18211C",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                })}
              >
                <Feather color="#0F7A4D" name="search" size={15} />
                <Text className="text-xs font-semibold text-hypo-brand">이 지역에서 검색</Text>
              </Pressable>
            ) : null}
            {mapBannerCopy ? <MapBanner title={mapBannerCopy} /> : null}
          </View>

          <MapSearchOverlay
            activeFilter={mapModeFilter}
            topInset={insets.top}
            isCurrentLocationBusy={locationState === "checking" || locationState === "requesting"}
            isDropdownOpen={isPlaceDropdownOpen}
            isSearching={placeSearch.isPending}
            query={mapSearchQuery}
            results={placeResults}
            selectedPlaceId={selectedPlaceId}
            searchError={
              mapSearchError ??
              (isPlaceDropdownOpen && placeSearch.isError ? "지역 검색을 불러오지 못했어요." : null)
            }
            showEmptyResult={isPlaceDropdownOpen && placeSearch.showEmpty}
            onCurrentLocationPress={() => {
              setSelectedPlace(null);
              setSelectedPlaceId(null);
              void requestCurrentLocation();
            }}
            onFocus={() => {
              if (mapSearchQuery.trim().length >= 2) {
                setIsPlaceDropdownOpen(true);
              }
            }}
            onQueryChange={(value) => {
              setMapSearchQuery(value);
              setSelectedPlace(null);
              setSelectedPlaceId(null);
              setMapSearchError(null);
              setIsPlaceDropdownOpen(value.trim().length >= 2);
            }}
            onResultPress={selectMapPlace}
            onFilterChange={(nextFilter) => {
              setMapModeFilter(nextFilter);
              setSelectedPostId(null);
              setSelectedMarkerGroupId(null);
              setSheetLevel("min");
            }}
            onSubmit={submitMapSearch}
          />
        </View>
      </View>

      <Animated.View
          style={{
            bottom: tabBarHeight,
            height: animatedSheetHeight,
            elevation: 16,
          }}
          className="absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-[24px] border-t border-hypo-border bg-hypo-surface shadow-lg"
        >
          <View {...sheetPanResponder.panHandlers} className="items-center py-2.5">
            <View className="h-1.5 w-11 rounded-full bg-hypo-border" />
          </View>

          <View className="flex-row items-center justify-between gap-3 px-4 pb-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-black text-hypo-text">{sheetTitle}</Text>
            </View>
            <Text className="text-xs font-semibold text-hypo-muted">{sheetCount}개</Text>
          </View>

          <View className="min-h-0 flex-1">
            {showBlockingState ? (
              <View className="flex-1 justify-center px-4 pb-6 pt-2">
                {isLoading || isFetching ? (
                  <StateMessage title="공고를 불러오는 중이에요." loading />
                ) : isError ? (
                  <View className="items-center gap-3">
                    <StateMessage title="공고를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." />
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 justify-center rounded-lg bg-hypo-brand px-4"
                      onPress={() => void refetchPosts()}
                      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                    >
                      <Text className="text-[13px] font-semibold text-white">다시 시도</Text>
                    </Pressable>
                  </View>
                ) : (
                  <StateMessage title="이 지역에는 아직 공고가 없어요." />
                )}
              </View>
            ) : null}

            {!showBlockingState ? (
              <ScrollView
                ref={sheetScrollRef}
                contentContainerClassName="px-4 pt-2"
                contentContainerStyle={{ paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {selectedPost ? (
                  <SelectedMapPostCard
                    currentUserId={appUser?.id}
                    post={selectedPost}
                    onApply={() =>
                      router.push({
                        pathname: "/interviews/[postId]",
                        params: { apply: "1", postId: selectedPost.id, returnTo: "/(tabs)/map" },
                      })
                    }
                    onClose={() => {
                      setSelectedPostId(null);
                    }}
                    onDetail={() =>
                      router.push({
                        pathname: "/interviews/[postId]",
                        params: { postId: selectedPost.id, returnTo: "/(tabs)/map" },
                      })
                    }
                  />
                ) : null}

                {sheetPosts.filter((post) => post.id !== selectedPostId).map((post) => (
                  <MapListRow
                    key={post.id}
                    isSelected={post.id === selectedPostId}
                    isViewed={viewedPostIds.has(post.id)}
                    post={post}
                    onPress={() => selectPost(post)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        </Animated.View>

    </View>
  );
}

const NativePostMarker = memo(function NativePostMarker({
  compensationLabel,
  id,
  latitude,
  longitude,
  onSelect,
  selected,
  viewed,
}: {
  compensationLabel: string;
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (postId: string) => void;
  selected: boolean;
  viewed: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerTone = selected ? "selected" : viewed ? "viewed" : "default";
  const markerFill = selected ? "#0F7A4D" : "#FFFFFF";
  const markerBorder = selected ? "#0F7A4D" : "#DCE4DF";
  const markerText = selected ? "#FFFFFF" : "#0B5C3A";

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [compensationLabel, markerTone]);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -30 }}
      identifier={id}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 20 : 1}
      onPress={handlePress}
    >
      <View className="items-center p-1.5">
        <View
          className="min-h-8 min-w-[54px] items-center justify-center rounded-full px-2.5"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1,
            elevation: selected ? 3 : 1,
            shadowColor: "#18211C",
            shadowOpacity: selected ? 0.14 : 0.08,
            shadowRadius: selected ? 5 : 3,
            shadowOffset: { width: 0, height: 2 },
            transform: [{ scale: selected ? 1.08 : 1 }],
          }}
        >
          <Text
            className="text-[11px] font-black leading-4"
            style={{ color: markerText }}
          >
            {compensationLabel}
          </Text>
        </View>
        <View
          style={{
            borderLeftColor: "transparent",
            borderLeftWidth: 6,
            borderRightColor: "transparent",
            borderRightWidth: 6,
            borderTopColor: markerFill,
            borderTopWidth: 7,
            height: 0,
            marginTop: -1,
            width: 0,
          }}
        />
      </View>
    </Marker>
  );
});

const NativePostGroupMarker = memo(function NativePostGroupMarker({
  count,
  id,
  latitude,
  longitude,
  onSelect,
  selected,
}: {
  count: number;
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (groupId: string) => void;
  selected: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerFill = selected ? "#0F7A4D" : "#FFFFFF";
  const markerBorder = selected ? "#0F7A4D" : "#DCE4DF";
  const markerText = selected ? "#FFFFFF" : "#0B5C3A";

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 360);

    return () => {
      clearTimeout(timer);
    };
  }, [count, selected]);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -16 }}
      coordinate={{ latitude, longitude }}
      identifier={id}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 20 : 1}
      onPress={handlePress}
    >
      <View className="items-center p-1.5">
        <View
          className="h-9 min-w-[52px] items-center justify-center rounded-full px-3"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1.5,
            elevation: selected ? 3 : 1,
            shadowColor: "#18211C",
            shadowOpacity: selected ? 0.14 : 0.08,
            shadowRadius: selected ? 5 : 3,
            shadowOffset: { width: 0, height: 2 },
            transform: [{ scale: selected ? 1.05 : 1 }],
          }}
        >
          <Text className="text-[12px] font-black leading-4" style={{ color: markerText, fontFamily: "HypofitSansBold" }}>
            {count}
          </Text>
        </View>
        <View
          style={{
            borderLeftColor: "transparent",
            borderLeftWidth: 6,
            borderRightColor: "transparent",
            borderRightWidth: 6,
            borderTopColor: markerFill,
            borderTopWidth: 7,
            height: 0,
            marginTop: -1,
            width: 0,
          }}
        />
      </View>
    </Marker>
  );
});

const NativeSearchPlaceMarker = memo(function NativeSearchPlaceMarker({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Marker
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={{ latitude, longitude }}
      identifier={`search-place-${latitude}-${longitude}`}
      tracksViewChanges={false}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full border border-white bg-hypo-brand/15 shadow-lg">
        <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-hypo-brand">
          <View className="h-1.5 w-1.5 rounded-full bg-white" />
        </View>
      </View>
    </Marker>
  );
});

function MapBanner({ title }: { title: string }) {
  return (
    <View className="rounded-[14px] border border-hypo-border bg-hypo-surface px-3 py-2">
      <Text className="text-center text-xs font-bold leading-4 text-hypo-muted">{title}</Text>
    </View>
  );
}

function MapSearchOverlay({
  activeFilter,
  isDropdownOpen,
  isCurrentLocationBusy,
  isSearching,
  onFilterChange,
  onCurrentLocationPress,
  onFocus,
  onQueryChange,
  onResultPress,
  onSubmit,
  query,
  results,
  selectedPlaceId,
  searchError,
  showEmptyResult,
  topInset,
}: {
  activeFilter: MapModeFilter;
  isDropdownOpen: boolean;
  isCurrentLocationBusy: boolean;
  isSearching: boolean;
  onFilterChange: (filter: MapModeFilter) => void;
  onCurrentLocationPress: () => void;
  onFocus: () => void;
  onQueryChange: (value: string) => void;
  onResultPress: (place: PlaceSearchResult) => void;
  onSubmit: () => void;
  query: string;
  results: PlaceSearchResult[];
  selectedPlaceId: string | null;
  searchError: string | null;
  showEmptyResult: boolean;
  topInset: number;
}) {
  const shouldShowDropdown = isDropdownOpen && (
    Boolean(searchError) ||
    isSearching ||
    showEmptyResult ||
    results.length > 0
  );

  return (
    <View className="absolute left-4 right-4 z-30 gap-2" style={{ top: topInset + 8 }}>
      <SearchField
        blurOnSubmit
        containerClassName="h-[52px] rounded-[14px] border-hypo-border bg-hypo-surface/95"
        iconColor="#69716C"
        placeholder="지역, 역, 학교 검색"
        returnKeyType="search"
        value={query}
        onChangeText={onQueryChange}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
      />

      <View className="flex-row items-center gap-2">
        <ScrollView
          horizontal
          className="min-w-0 flex-1"
          contentContainerClassName="gap-1.5"
          showsHorizontalScrollIndicator={false}
        >
          {mapModeFilters.map((filter) => {
            const isActive = filter.value === activeFilter;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                className={`min-h-11 justify-center rounded-full border px-3 ${
                  isActive
                    ? "border-hypo-brand bg-hypo-brand"
                    : "border-hypo-border bg-hypo-surface/95"
                }`}
                onPress={() => onFilterChange(filter.value)}
                style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
              >
                <Text className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-hypo-text"}`}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityLabel="내 주변 보기"
          accessibilityRole="button"
          disabled={isCurrentLocationBusy}
          hitSlop={6}
          className="h-11 w-11 items-center justify-center rounded-full border border-hypo-border bg-hypo-surface/95"
          onPress={onCurrentLocationPress}
          style={({ pressed }) => ({
            elevation: 1,
            opacity: isCurrentLocationBusy ? 0.48 : pressed ? 0.76 : 1,
            shadowColor: "#18211C",
            shadowOpacity: 0.06,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
          })}
        >
          <Feather color="#0F7A4D" name="crosshair" size={18} />
        </Pressable>
      </View>

      {shouldShowDropdown ? (
        <View className="overflow-hidden rounded-[14px] border border-hypo-border bg-hypo-surface/95">
          {searchError ? (
            <PlaceSuggestionStatus
              icon="alert-circle"
              title={searchError}
              tone="danger"
            />
          ) : null}

          {!searchError && isSearching ? (
            <PlaceSuggestionStatus
              icon="loader"
              title="지역을 찾고 있어요"
              tone="brand"
            />
          ) : null}

          {!searchError && !isSearching && showEmptyResult ? (
            <PlaceSuggestionStatus
              icon="map-pin"
              title="검색 결과가 없어요"
              body="다른 지역명이나 역 이름으로 검색해보세요"
              tone="muted"
            />
          ) : null}

          {results.map((place) => (
            <PlaceSuggestionRow
              key={place.id}
              isSelected={place.id === selectedPlaceId}
              place={place}
              onPress={() => onResultPress(place)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PlaceSuggestionStatus({
  body,
  icon,
  title,
  tone,
}: {
  body?: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  tone: "brand" | "danger" | "muted";
}) {
  const iconColor = tone === "danger" ? "#B42318" : tone === "brand" ? "#176B5D" : "#69716C";
  const titleColor = tone === "danger" ? "text-hypo-danger" : tone === "brand" ? "text-hypo-brand" : "text-hypo-muted";

  return (
    <View className="min-h-[54px] flex-row items-center gap-2.5 px-3 py-2.5">
      <Feather color={iconColor} name={icon} size={16} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={`text-xs font-black leading-5 ${titleColor}`}>
          {title}
        </Text>
        {body ? (
          <Text numberOfLines={1} className="text-[11px] font-bold leading-4 text-hypo-muted">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PlaceSuggestionRow({
  isSelected,
  onPress,
  place,
}: {
  isSelected: boolean;
  onPress: () => void;
  place: PlaceSearchResult;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className="min-h-[56px] flex-row items-center gap-2.5 border-t border-hypo-border/70 px-3 py-2.5"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed || isSelected ? "#E7F1EE" : "transparent",
      })}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#EEF3EF]">
        <Feather color={isSelected ? "#176B5D" : "#69716C"} name="map-pin" size={15} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[13px] font-black leading-5 text-hypo-text">
          {place.name}
        </Text>
        <Text numberOfLines={1} className="text-[11px] font-bold leading-4 text-hypo-muted">
          {place.road_address || place.address || "좌표로 이동합니다"}
        </Text>
      </View>
    </Pressable>
  );
}

function SelectedMapPostCard({
  currentUserId,
  onApply,
  onClose,
  onDetail,
  post,
}: {
  currentUserId?: string | null;
  onApply: () => void;
  onClose: () => void;
  onDetail: () => void;
  post: InterviewPost;
}) {
  const distanceLabel = formatMapDistance(post.distance_meters, "거리 확인 전");
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const isSurvey = post.recruitment_type === "survey";

  return (
    <View className="rounded-[16px] border border-hypo-border bg-hypo-bg p-3.5">
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[12px] font-semibold text-hypo-brand">
          {`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)}`}
        </Text>
        <Text numberOfLines={1} className="text-[14px] font-bold text-hypo-text">
          {getPostingCompensationLabel(post)}
        </Text>
        <Pressable
          accessibilityLabel="공고 선택 해제"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center"
          hitSlop={8}
          onPress={onClose}
        >
          <Feather color="#87918B" name="x" size={18} />
        </Pressable>
      </View>

      <Text numberOfLines={2} className="mt-2 text-[16px] font-semibold leading-6 text-hypo-text">
        {post.title}
      </Text>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Feather color="#87918B" name="map-pin" size={14} />
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[13px] leading-5 text-hypo-muted">
          {getPostLocationLabel(post)} · {distanceLabel}
        </Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        <PrimaryButton variant="secondary" onPress={onDetail}>
          상세 보기
        </PrimaryButton>
        <PrimaryButton
          variant={isOwnPost ? "secondary" : "primary"}
          onPress={isOwnPost ? () => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/map" } }) : isSurvey ? onDetail : onApply}
        >
          {isOwnPost ? "공고 관리" : isSurvey ? "설문 보기" : "신청하기"}
        </PrimaryButton>
      </View>
    </View>
  );
}

function MapListRow({
  isSelected,
  isViewed,
  onPress,
  post,
}: {
  isSelected: boolean;
  isViewed: boolean;
  onPress: () => void;
  post: InterviewPost;
}) {
  const locationLabel = getPostLocationLabel(post);
  const distanceLabel = formatMapDistance(post.distance_meters);

  return (
    <ListRow isSelected={isSelected} isViewed={isViewed} onPress={onPress}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start gap-1.5">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[11px] font-medium text-hypo-brand">{`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)}`}</Text>
              <Text numberOfLines={1} className="min-w-0 text-[16px] font-semibold leading-5 text-hypo-text">
                {post.title}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} className="mt-1 text-xs font-medium leading-5 text-hypo-muted">
            {distanceLabel ? `${locationLabel} · ${distanceLabel}` : locationLabel}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[13px] font-bold text-hypo-text">
            {getPostingCompensationLabel(post)}
          </Text>
        </View>
      </View>
    </ListRow>
  );
}

function getMapBannerCopy(
  locationState: LocationState,
  isError: boolean,
  hasStablePosts: boolean,
) {
  if (locationState === "checking" || locationState === "requesting") {
    return "현재 위치를 확인하고 있어요.";
  }

  if (locationState === "denied") {
    return "위치 권한을 켜면 내 주변 공고를 볼 수 있어요.";
  }

  if (locationState === "unavailable") {
    return "현재 위치 대신 주변 공고를 보여드릴게요.";
  }

  if (isError && hasStablePosts) {
    return "공고를 다시 불러오지 못했어요.";
  }

  return null;
}

function withLocationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("map_location_timeout")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function getPostLocationLabel(post: InterviewPost) {
  return post.location_place_name ?? post.location_text ?? post.location ?? "장소 협의";
}

function isStrongPlaceMatch(query: string, place: PlaceSearchResult) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(place.name);

  return normalizedName === normalizedQuery || normalizedName.startsWith(normalizedQuery);
}

function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildMapMarkerItems(posts: InterviewPostWithCoordinates[]): MapMarkerItem[] {
  const groups = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      posts: InterviewPostWithCoordinates[];
    }
  >();

  for (const post of posts) {
    const key = getCoordinateGroupKey(post.location_latitude, post.location_longitude);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.posts.push(post);
      continue;
    }

    groups.set(key, {
      latitude: post.location_latitude,
      longitude: post.location_longitude,
      posts: [post],
    });
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    if (group.posts.length === 1) {
      const [post] = group.posts;

      return {
        id: post.id,
        latitude: group.latitude,
        longitude: group.longitude,
        post,
        type: "single",
      };
    }

    return {
      id: `group:${key}`,
      latitude: group.latitude,
      longitude: group.longitude,
      posts: group.posts,
      type: "group",
    };
  });
}

function getCoordinateGroupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

function getMarkerGroupSheetTitle(group: Extract<MapMarkerItem, { type: "group" }>) {
  const [firstPost] = group.posts;
  const placeName = firstPost?.location_place_name ?? firstPost?.location_text ?? firstPost?.location;

  return placeName?.trim() || "이 위치의 공고";
}

function getRegionSearchRadiusM(region: Region) {
  const latitudeMeters = Math.abs(region.latitudeDelta) * 111_320 * 0.5;
  const longitudeMeters = Math.abs(region.longitudeDelta) * 111_320 * Math.cos(toRadians(region.latitude)) * 0.5;
  const diagonalRadius = Math.sqrt(latitudeMeters ** 2 + longitudeMeters ** 2);

  return Math.round(clampNumber(diagonalRadius * 1.15, minimumMapRadiusM, maximumMapRadiusM));
}

function clampNumber(value: number, lower: number, upper: number) {
  if (!Number.isFinite(value)) {
    return lower;
  }

  return Math.max(lower, Math.min(value, upper));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getMapMarkerCompensationLabel(post: InterviewPost) {
  const label = getPostingCompensationLabel(post);

  return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

function hasMeaningfulRegionChange(next: Region, lastSearched: Region) {
  const centerDistanceM = getCoordinateDistanceM(
    next.latitude,
    next.longitude,
    lastSearched.latitude,
    lastSearched.longitude,
  );
  const minimumCenterDistanceM = Math.max(minimumSearchAreaMoveM, getRegionSearchRadiusM(lastSearched) * 0.2);
  const zoomChanged =
    Math.abs(next.latitudeDelta - lastSearched.latitudeDelta) / Math.max(lastSearched.latitudeDelta, 0.0001) > 0.18 ||
    Math.abs(next.longitudeDelta - lastSearched.longitudeDelta) / Math.max(lastSearched.longitudeDelta, 0.0001) > 0.18;

  return centerDistanceM >= minimumCenterDistanceM || zoomChanged;
}

function getCoordinateDistanceM(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const latitudeMeters = (latitudeA - latitudeB) * 111_320;
  const longitudeMeters = (longitudeA - longitudeB) * 111_320 * Math.cos(toRadians((latitudeA + latitudeB) / 2));

  return Math.sqrt(latitudeMeters ** 2 + longitudeMeters ** 2);
}

function hasMapCoordinates(
  post: InterviewPost,
): post is InterviewPost & { location_latitude: number; location_longitude: number } {
  return (
    typeof post.location_latitude === "number" &&
    Number.isFinite(post.location_latitude) &&
    typeof post.location_longitude === "number" &&
    Number.isFinite(post.location_longitude)
  );
}

function isRenderableMapPost(post: InterviewPost): post is InterviewPostWithCoordinates {
  return post.interview_mode !== "online" && hasMapCoordinates(post);
}
