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
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import MapView, { Marker, type Point, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { InterviewMode, InterviewPost } from "@hypofit/contracts";
import { formatRecruitCount, formatReward, interviewModeLabels } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInterviewPostViews, useMarkInterviewPostViewed } from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { useDebouncedPlaceSearch } from "@/features/places/useDebouncedPlaceSearch";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { PlaceSearchResult } from "@/shared/api/places";
import {
  getPostingCompensationLabel,
  getPostingDurationLabel,
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
const mapRegionDebounceMs = 450;
const currentLocationTimeoutMs = 7_000;
const markerPreviewWidthPx = 238;
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [region, setRegion] = useState(defaultRegion);
  const [queryRegion, setQueryRegion] = useState(defaultRegion);
  const [locationState, setLocationState] = useState<LocationState>("checking");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedMarkerGroupId, setSelectedMarkerGroupId] = useState<string | null>(null);
  const [markerPreviewPoint, setMarkerPreviewPoint] = useState<Point | null>(null);
  const [isListMode, setIsListMode] = useState(false);
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
  const animatedSheetHeight = useRef(new Animated.Value(getMapSheetHeights(windowHeight).min)).current;
  const queryRadiusM = useMemo(() => getRegionSearchRadiusM(queryRegion), [queryRegion]);

  const { data: posts = [], isError, isLoading } = useInterviewPosts({
    status: "open",
    ...(mapModeFilter === "all" ? {} : { mode: mapModeFilter }),
    lat: queryRegion.latitude,
    lng: queryRegion.longitude,
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
    radiusM: queryRadiusM,
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
    setQueryRegion((previous) => ({
      ...previous,
      ...nextRegion,
    }));
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryRegion(region);
    }, mapRegionDebounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [region]);

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
  const markerPreviewPosition = useMemo(() => {
    if (!markerPreviewPoint) {
      return null;
    }

    return {
      left: Math.max(12, Math.min(markerPreviewPoint.x - markerPreviewWidthPx / 2, windowWidth - markerPreviewWidthPx - 12)),
      top: Math.max(insets.top + 72, markerPreviewPoint.y - 104),
    };
  }, [insets.top, markerPreviewPoint, windowWidth]);

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
      setMarkerPreviewPoint(null);
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
    setIsListMode(false);
    setIsPlaceDropdownOpen(false);
    setSelectedPlace(null);
    setSelectedPlaceId(null);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setMarkerPreviewPoint(null);
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
    setMarkerPreviewPoint(null);
    setSheetLevel("min");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);

  const handleMapPress = useCallback(() => {
    if (Date.now() < ignoreMapPressUntilRef.current) {
      return;
    }

    if (!selectedMarkerGroupId && !selectedPostId && !markerPreviewPoint && !isPlaceDropdownOpen) {
      return;
    }

    clearMapSelectionToNearby();
  }, [clearMapSelectionToNearby, isPlaceDropdownOpen, markerPreviewPoint, selectedMarkerGroupId, selectedPostId]);

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

  const updateMarkerPreviewPoint = useCallback(async (post: InterviewPost) => {
    if (!hasMapCoordinates(post)) {
      setMarkerPreviewPoint(null);
      return;
    }

    try {
      const point = await mapRef.current?.pointForCoordinate({
        latitude: post.location_latitude,
        longitude: post.location_longitude,
      });

      if (isMountedRef.current && point) {
        setMarkerPreviewPoint(point);
      }
    } catch {
      if (isMountedRef.current) {
        setMarkerPreviewPoint(null);
      }
    }
  }, []);

  const selectPost = useCallback((post: InterviewPost, options: { expandSheet?: boolean } = {}) => {
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(post.id);
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });

    void updateMarkerPreviewPoint(post);

    if (options.expandSheet !== false) {
      setSheetLevel((currentLevel) => (currentLevel === "min" ? "mid" : currentLevel));
    }

    if (accessToken && !viewedPostIds.has(post.id)) {
      markViewed.mutate({ postId: post.id, source: "map" });
    }
  }, [accessToken, markViewed, updateMarkerPreviewPoint, viewedPostIds]);

  const focusPostFromList = useCallback((post: InterviewPost) => {
    setIsListMode(false);
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(post.id);
    setSheetLevel("min");
    sheetScrollRef.current?.scrollTo({ animated: false, y: 0 });

    if (hasMapCoordinates(post)) {
      const nextRegion = {
        ...region,
        latitude: post.location_latitude,
        longitude: post.location_longitude,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 260);
      setTimeout(() => {
        if (isMountedRef.current) {
          void updateMarkerPreviewPoint(post);
        }
      }, 280);
    } else {
      void updateMarkerPreviewPoint(post);
    }

    if (accessToken && !viewedPostIds.has(post.id)) {
      markViewed.mutate({ postId: post.id, source: "map" });
    }
  }, [accessToken, markViewed, region, updateMarkerPreviewPoint, viewedPostIds]);

  const selectMarkerGroup = useCallback((groupId: string) => {
    suppressMapPressFromMarker();

    const group = markerItems.find((item): item is Extract<MapMarkerItem, { type: "group" }> => (
      item.type === "group" && item.id === groupId
    ));

    if (!group) {
      return;
    }

    setIsListMode(false);
    setIsPlaceDropdownOpen(false);
    setSelectedPostId(null);
    setMarkerPreviewPoint(null);
    setSelectedMarkerGroupId(group.id);
    setSheetLevel("mid");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, [markerItems, suppressMapPressFromMarker]);

  const selectPostById = useCallback((postId: string) => {
    suppressMapPressFromMarker();

    const post = displayMapPosts.find((candidate) => candidate.id === postId);
    if (post) {
      selectPost(post, { expandSheet: false });
    }
  }, [displayMapPosts, selectPost, suppressMapPressFromMarker]);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
    setRegion(nextRegion);

    if (selectedPost) {
      void updateMarkerPreviewPoint(selectedPost);
    }
  }, [selectedPost, updateMarkerPreviewPoint]);

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
    setIsListMode(false);
    setSelectedPostId(null);
    setSelectedMarkerGroupId(null);
    setMarkerPreviewPoint(null);
    setSheetLevel("min");
    setRegion((previous) => ({
      ...previous,
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: Math.min(previous.latitudeDelta, 0.035),
      longitudeDelta: Math.min(previous.longitudeDelta, 0.035),
    }));
  };

  const mapBannerCopy = getMapBannerCopy(locationState, isError, stableMapPosts.length > 0);
  const showBlockingState = displayMapPosts.length === 0;
  const shouldShowListButton = displayMapPosts.length > 0 && !selectedPost && !selectedMarkerGroup && sheetLevel !== "max";
  const sheetTitle = selectedMarkerGroup ? "이 위치의 공고" : "근처 공고";
  const sheetSubtitle = selectedMarkerGroup
    ? `${selectedMarkerGroup.posts.length}개 · ${getMarkerGroupPlaceLabel(selectedMarkerGroup)}`
    : `${displayMapPosts.length}개 · 마커를 누르면 자세히 볼 수 있어요`;

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
                  selected={item.id === selectedMarkerGroupId}
                  title={getMarkerGroupPlaceLabel(item)}
                  onSelect={selectMarkerGroup}
                />
              ) : (
                <NativePostMarker
                  key={`native-post-marker-${item.post.id}`}
                  id={item.post.id}
                  latitude={item.latitude}
                  longitude={item.longitude}
                  rewardAmount={item.post.reward_amount}
                  selected={item.post.id === selectedPostId}
                  title={item.post.location_place_name ?? item.post.title}
                  viewed={viewedPostIds.has(item.post.id)}
                  onSelect={selectPostById}
                />
              ),
            )}
            {selectedPlace ? (
              <NativeSearchPlaceMarker
                latitude={selectedPlace.latitude}
                longitude={selectedPlace.longitude}
                title={selectedPlace.name}
              />
            ) : null}
          </MapView>

          {selectedPost && markerPreviewPosition ? (
            <MarkerPreviewCard
              currentUserId={appUser?.id}
              post={selectedPost}
              style={markerPreviewPosition}
              onApply={() =>
                router.push({
                  pathname: "/interviews/[postId]",
                  params: { apply: "1", postId: selectedPost.id, returnTo: "/(tabs)/map" },
                })
              }
              onClose={() => {
                setSelectedPostId(null);
                setMarkerPreviewPoint(null);
              }}
              onDetail={() =>
                router.push({
                  pathname: "/interviews/[postId]",
                  params: { postId: selectedPost.id, returnTo: "/(tabs)/map" },
                })
              }
            />
          ) : null}

          <View className="absolute left-3 right-3 gap-2" pointerEvents="none" style={{ top: insets.top + 112 }}>
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
              setMarkerPreviewPoint(null);
              setIsListMode(false);
              setSheetLevel("min");
            }}
            onSubmit={submitMapSearch}
          />
        </View>
      </View>

      {isListMode ? (
        <MapListOverlay
          insetsBottom={insets.bottom}
          insetsTop={insets.top}
          isError={isError}
          isLoading={isLoading}
          posts={displayMapPosts}
          selectedPostId={selectedPostId}
          viewedPostIds={viewedPostIds}
          onClose={() => setIsListMode(false)}
          onPostPress={focusPostFromList}
        />
      ) : null}

      {shouldShowListButton && !isListMode ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            bottom: Animated.add(animatedSheetHeight, tabBarHeight + 8),
          }}
          className="absolute left-3 z-40"
        >
          <Pressable
            accessibilityLabel="공고 목록 보기"
            accessibilityRole="button"
            hitSlop={4}
            className="h-10 flex-row items-center gap-1.5 rounded-full border border-hypo-border bg-hypo-surface/95 px-3 shadow-lg"
            onPress={() => setIsListMode(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
          >
            <Feather color="#1D2522" name="list" size={15} />
            <Text className="text-xs font-semibold text-hypo-text">목록</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {!isListMode ? (
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

          <View className="flex-row items-start justify-between gap-3 px-4 pb-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-black text-hypo-text">{sheetTitle}</Text>
              <Text className="mt-0.5 text-xs font-bold text-hypo-muted">
                {sheetSubtitle}
              </Text>
            </View>
          </View>

          <View className="min-h-0 flex-1">
            {showBlockingState ? (
              <View className="flex-1 justify-center px-4 pb-6 pt-2">
                {isLoading ? (
                  <StateMessage title="공고를 불러오는 중이에요." loading />
                ) : isError ? (
                  <StateMessage title="공고를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." />
                ) : (
                  <StateMessage title="이 지역에 표시할 공고가 없어요." />
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
                      setMarkerPreviewPoint(null);
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
      ) : null}
    </View>
  );
}

function MapListOverlay({
  insetsBottom,
  insetsTop,
  isError,
  isLoading,
  onClose,
  onPostPress,
  posts,
  selectedPostId,
  viewedPostIds,
}: {
  insetsBottom: number;
  insetsTop: number;
  isError: boolean;
  isLoading: boolean;
  onClose: () => void;
  onPostPress: (post: InterviewPost) => void;
  posts: InterviewPost[];
  selectedPostId: string | null;
  viewedPostIds: Set<string>;
}) {
  const hasPosts = posts.length > 0;

  return (
    <View
      className="absolute inset-0 z-50 bg-hypo-bg"
      style={{
        paddingBottom: Math.max(insetsBottom, 10),
        paddingTop: insetsTop,
      }}
    >
      <View className="border-b border-hypo-border bg-hypo-surface px-4 pb-3 pt-2">
        <View className="min-h-11 flex-row items-center gap-2">
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            className="h-10 w-10 items-center justify-center"
            onPress={onClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <Text className="text-[34px] font-semibold leading-9 text-hypo-text">‹</Text>
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-[18px] font-bold text-hypo-text">목록</Text>
            <Text className="mt-0.5 text-xs font-medium text-hypo-muted">
              지도에서 찾은 공고 {posts.length}개
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center px-4">
          <StateMessage title="공고를 불러오는 중이에요." loading />
        </View>
      ) : null}

      {!isLoading && isError ? (
        <View className="flex-1 justify-center px-4">
          <StateMessage title="공고를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." />
        </View>
      ) : null}

      {!isLoading && !isError && !hasPosts ? (
        <View className="flex-1 justify-center px-4">
          <StateMessage title="이 지역에 표시할 공고가 없어요." />
        </View>
      ) : null}

      {!isLoading && !isError && hasPosts ? (
        <ScrollView
          contentContainerClassName="px-4 pb-5 pt-3"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-hypo-surface">
            {posts.map((post) => (
              <MapListRow
                key={`map-list-overlay-${post.id}`}
                isSelected={post.id === selectedPostId}
                isViewed={viewedPostIds.has(post.id)}
                post={post}
                onPress={() => onPostPress(post)}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function MarkerPreviewCard({
  currentUserId,
  onApply,
  onClose,
  onDetail,
  post,
  style,
}: {
  currentUserId?: string | null;
  onApply: () => void;
  onClose: () => void;
  onDetail: () => void;
  post: InterviewPost;
  style: StyleProp<ViewStyle>;
}) {
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const isSurvey = post.recruitment_type === "survey";

  return (
    <View
      className="absolute z-20 rounded-[18px] border border-hypo-border bg-hypo-surface px-3 py-3 shadow-lg"
      pointerEvents="box-none"
      style={[{ width: markerPreviewWidthPx }, style]}
    >
      <View className="flex-row items-start gap-2">
        <Pressable className="min-w-0 flex-1" onPress={onDetail} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
          <Text numberOfLines={1} className="text-[11px] font-semibold text-hypo-brand">
            {getPostingCompensationLabel(post)}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[13px] font-black leading-5 text-hypo-text">
            {post.title}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[11px] font-bold text-hypo-muted">
            {getPostLocationLabel(post)}
          </Text>
        </Pressable>

        <Pressable accessibilityLabel="닫기" accessibilityRole="button" hitSlop={10} onPress={onClose}>
          <Feather color="#7D877A" name="x" size={16} />
        </Pressable>
      </View>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-full border border-hypo-border bg-hypo-bg"
          onPress={onDetail}
          style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
        >
          <Text className="text-[11px] font-black text-hypo-text">상세 보기</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className={`min-h-11 flex-1 items-center justify-center rounded-full ${isOwnPost ? "bg-hypo-surface" : "bg-hypo-brand"}`}
          onPress={isOwnPost ? () => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/map" } }) : isSurvey ? onDetail : onApply}
          style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
        >
          <Text className={`text-[11px] font-black ${isOwnPost ? "text-hypo-muted" : "text-white"}`}>
            {isOwnPost ? "내 공고" : isSurvey ? "설문 보기" : "신청하기"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const NativePostMarker = memo(function NativePostMarker({
  id,
  latitude,
  longitude,
  onSelect,
  rewardAmount,
  selected,
  title,
  viewed,
}: {
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (postId: string) => void;
  rewardAmount: number;
  selected: boolean;
  title: string;
  viewed: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerTone = selected ? "selected" : viewed ? "viewed" : "default";
  const markerFill = selected ? "#176B5D" : viewed ? "#F8FAF7" : "#F4A51C";
  const markerBorder = selected ? "#0F5C4F" : viewed ? "#D9E2D8" : "#D48C07";
  const markerText = selected ? "#FFFFFF" : viewed ? "#69716C" : "#172018";

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
  }, [markerTone, rewardAmount]);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -30 }}
      identifier={id}
      coordinate={{ latitude, longitude }}
      description={formatReward(rewardAmount)}
      title={title}
      tracksViewChanges={tracksViewChanges}
      onPress={handlePress}
    >
      <View className="items-center">
        <View
          className="h-8 min-w-[54px] items-center justify-center rounded-full px-2.5 shadow-lg"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1,
          }}
        >
          <Text
            className="text-[11px] font-black leading-4"
            style={{ color: markerText }}
          >
            {formatMarkerReward(rewardAmount)}
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
        {selected ? <View className="mt-1 h-1.5 w-1.5 rounded-full bg-[#176B5D]" /> : null}
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
  title,
}: {
  count: number;
  id: string;
  latitude: number;
  longitude: number;
  onSelect: (groupId: string) => void;
  selected: boolean;
  title: string;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const markerFill = selected ? "#176B5D" : "#F8FAF7";
  const markerBorder = selected ? "#0F5C4F" : "#176B5D";
  const markerText = selected ? "#FFFFFF" : "#176B5D";

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
      description={`${count}개 공고`}
      identifier={id}
      title={title}
      tracksViewChanges={tracksViewChanges}
      onPress={handlePress}
    >
      <View className="items-center">
        <View
          className="h-9 min-w-[52px] items-center justify-center rounded-full px-3 shadow-lg"
          style={{
            backgroundColor: markerFill,
            borderColor: markerBorder,
            borderWidth: 1.5,
          }}
        >
          <Text className="text-[12px] font-black leading-4" style={{ color: markerText, fontFamily: "HypofitSansBold" }}>
            +{count}
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
        {selected ? <View className="mt-1 h-1.5 w-1.5 rounded-full bg-[#176B5D]" /> : null}
      </View>
    </Marker>
  );
});

const NativeSearchPlaceMarker = memo(function NativeSearchPlaceMarker({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title: string;
}) {
  return (
    <Marker
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={{ latitude, longitude }}
      description="검색한 위치"
      identifier={`search-place-${latitude}-${longitude}`}
      title={title}
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
        containerClassName="h-12 rounded-[14px] border-hypo-border/80 bg-hypo-surface/95 shadow-lg"
        iconColor="#69716C"
        placeholder="지역, 역, 학교 검색"
        returnKeyType="search"
        rightAccessory={
          <Pressable
            accessibilityLabel="내 주변 보기"
            accessibilityRole="button"
            disabled={isCurrentLocationBusy}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full"
            onPress={onCurrentLocationPress}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#E7F1EE" : "transparent",
              opacity: isCurrentLocationBusy ? 0.48 : 1,
            })}
          >
            <Feather color="#176B5D" name="crosshair" size={17} />
          </Pressable>
        }
        value={query}
        onChangeText={onQueryChange}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
      />

      <ScrollView
        horizontal
        contentContainerClassName="gap-1.5 pr-4"
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
                  : "border-hypo-border/80 bg-hypo-surface/95"
              }`}
              onPress={() => onFilterChange(filter.value)}
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <Text
                className={`text-[11px] font-black ${
                  isActive ? "text-white" : "text-hypo-muted"
                }`}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {shouldShowDropdown ? (
        <View className="overflow-hidden rounded-[14px] border border-hypo-border/80 bg-hypo-surface/95 shadow-lg">
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
  const durationLabel = getPostingDurationLabel(post);
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const isSurvey = post.recruitment_type === "survey";

  return (
    <View className="rounded-[18px] border border-hypo-border bg-hypo-bg p-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="text-[11px] font-medium text-hypo-brand">{`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)}`}</Text>
            <View className="rounded-full bg-hypo-surface px-2.5 py-0.5">
              <Text className="text-[10px] font-black text-hypo-muted">{distanceLabel}</Text>
            </View>
          </View>

          <Text numberOfLines={2} className="mt-2 text-[16px] font-semibold leading-6 text-hypo-text">
            {post.title}
          </Text>
        </View>

        <Pressable accessibilityLabel="닫기" accessibilityRole="button" hitSlop={12} onPress={onClose}>
          <Text className="text-[26px] font-black leading-6 text-hypo-muted">×</Text>
        </Pressable>
      </View>

      <Text numberOfLines={2} className="mt-2 text-xs font-bold leading-5 text-hypo-muted">
        {post.service_summary}
      </Text>

      <View className="mt-3 rounded-[14px] bg-hypo-surface px-3 py-2.5">
        <Text className="text-[12px] font-semibold text-hypo-text">찾는 참여자</Text>
        <Text numberOfLines={2} className="mt-1 text-[13px] leading-5 text-hypo-muted">
          {post.target_description}
        </Text>
      </View>

      <View className="mt-3 gap-1.5">
        <PreviewMeta label="위치" value={getPostLocationLabel(post)} />
        <PreviewMeta label="모집 인원" value={formatRecruitCount(post.recruit_count)} />
        <PreviewMeta label="일정" value={post.schedule_options[0] ?? "시간 협의"} />
        {durationLabel ? <PreviewMeta label="예상 시간" value={durationLabel} /> : null}
        <PreviewMeta label="보상" value={getPostingCompensationLabel(post)} highlighted />
      </View>

      <View className="mt-3 flex-row gap-2">
        <PrimaryButton variant="secondary" onPress={onDetail}>
          상세 보기
        </PrimaryButton>
        <PrimaryButton
          variant={isOwnPost ? "secondary" : "primary"}
          onPress={isOwnPost ? () => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/map" } }) : isSurvey ? onDetail : onApply}
        >
          {isOwnPost ? "내 공고" : isSurvey ? "설문 보기" : "신청하기"}
        </PrimaryButton>
      </View>
    </View>
  );
}

function PreviewMeta({
  highlighted,
  label,
  value,
}: {
  highlighted?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="w-14 text-xs font-black text-[#7D877A]">{label}</Text>
      <Text numberOfLines={1} className={`min-w-0 flex-1 text-xs font-extrabold ${highlighted ? "text-[#087C43]" : "text-hypo-text"}`}>
        {value}
      </Text>
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
              <Text numberOfLines={1} className={`min-w-0 text-[16px] font-semibold leading-5 ${isViewed && !isSelected ? "text-hypo-muted" : "text-hypo-text"}`}>
              {post.title}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} className={`mt-1 text-xs font-bold leading-5 ${isViewed && !isSelected ? "text-[#8D958B]" : "text-hypo-muted"}`}>
            {locationLabel}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-[13px] font-semibold ${isViewed && !isSelected ? "text-hypo-text-soft" : "text-hypo-brand"}`}>
            {getPostingCompensationLabel(post)}
          </Text>
          {distanceLabel ? <Text className="mt-1 text-[10px] font-black text-hypo-muted">{distanceLabel}</Text> : null}
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

function getMarkerGroupPlaceLabel(group: Extract<MapMarkerItem, { type: "group" }>) {
  const [firstPost] = group.posts;

  if (!firstPost) {
    return "같은 위치";
  }

  return getPostLocationLabel(firstPost);
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

function formatMarkerReward(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "보상";
  }

  if (amount >= 10000) {
    const value = amount / 10000;
    const label = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
    return `${label}만`;
  }

  return `${Math.max(1, Math.round(amount / 1000))}천`;
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
