import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AccessibilityInfo,
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
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useReducedMotion } from "react-native-reanimated";
import type * as Location from "expo-location";
import { useMapDeviceLocation } from "./useMapDeviceLocation";
import { router } from "expo-router";
import MapView, { type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { InterviewPost } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  usePostingViews,
  useMarkPostingViewed,
} from "@/features/postings/usePostingViews";
import { usePostings } from "@/features/postings/usePostings";
import { useDebouncedPlaceSearch } from "@/features/places/useDebouncedPlaceSearch";
import { StateMessage } from "@/shared/ui/StateMessage";
import type { PlaceSearchResult } from "@/features/places/placesApi";
import { SwiftUIGlassHeaderButton } from "@/shared/ui/SwiftUIGlassHeaderButton";
import { colors, motion } from "@/shared/theme/tokens";
import { getBottomTabBarHeight } from "@/shared/navigation/tabBarStyle";
import {
  clampMapSheetHeight,
  getCycleMapSheetLevel,
  getHigherMapSheetLevel,
  getLowerMapSheetLevel,
  getMapSheetHeights,
  getNearestMapSheetLevel,
  type MapSheetLevel,
} from "./mapSheet";
import { subscribeMapTabReselect } from "./mapTabEvents";
import {
  defaultRegion,
  getPostsInMapRegion,
  getRegionSearchRadiusM,
  hasMeaningfulRegionChange,
} from "./mapViewport";
import { buildMapMarkerItems, hasMapCoordinates, isRenderableMapPost } from "./mapMarkerGrouping";
import {
  getMapBannerCopy,
  getMapMarkerCompensationLabel,
  getMarkerGroupSheetTitle,
} from "./mapPresentation";
import { isStrongPlaceMatch } from "./mapPlaceSearch";
import type { PostingWithCoordinates, MapMarkerItem, MapModeFilter } from "./mapTypes";
import { NativePostGroupMarker, NativePostMarker, NativeSearchPlaceMarker } from "./MapMarkers";
import { MapBanner, MapControlSurface, MapSearchOverlay } from "./MapSearchOverlay";
import { MapListRow, SelectedMapPostCard } from "./MapPostPreview";

const markerPressMapTapGuardMs = 350;

const sheetTapThresholdPx = 6;

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getBottomTabBarHeight(insets.bottom);
  const { accessToken, appUser } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [region, setRegion] = useState(defaultRegion);
  const [queryRegion, setQueryRegion] = useState(defaultRegion);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedMarkerGroupId, setSelectedMarkerGroupId] = useState<string | null>(null);
  const [isSearchAreaDirty, setIsSearchAreaDirty] = useState(false);
  const [sheetLevel, setSheetLevel] = useState<MapSheetLevel>("hidden");
  const [containerHeight, setContainerHeight] = useState(0);
  const [reduceTransparency, setReduceTransparency] = useState(true);
  const reduceMotion = useReducedMotion();
  const [stableMapPosts, setStableMapPosts] = useState<PostingWithCoordinates[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);
  const [mapModeFilter, setMapModeFilter] = useState<MapModeFilter>("all");
  const mapRef = useRef<MapView | null>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const dragStartHeightRef = useRef(0);
  const didDragRef = useRef(false);
  const ignoreMapPressUntilRef = useRef(0);
  const suppressNextSearchAreaDirtyRef = useRef(false);
  const animatedSheetHeight = useRef(new Animated.Value(getMapSheetHeights(windowHeight).mid)).current;
  const sheetVisibility = useRef(new Animated.Value(1)).current;
  const isSheetHidden = sheetLevel === "hidden";
  const glassAvailable = Platform.OS === "ios" && !reduceTransparency
    && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const queryRadiusM = useMemo(() => getRegionSearchRadiusM(queryRegion), [queryRegion]);

  const { data: posts, isError, isFetching, isLoading, refetch: refetchPosts } = usePostings({
    status: "open",
    ...(mapModeFilter === "all" ? {} : { mode: mapModeFilter }),
    lat: queryRegion.latitude,
    lng: queryRegion.longitude,
    limit: 100,
    radiusM: queryRadiusM,
    sort: "distance",
  });
  const { data: postViews = [] } = usePostingViews(accessToken);
  const markViewed = useMarkPostingViewed(accessToken);
  const placeSearch = useDebouncedPlaceSearch({
    enabled: isPlaceDropdownOpen,
    query: mapSearchQuery,
    lat: queryRegion.latitude,
    lng: queryRegion.longitude,
    limit: 5,
  });
  const placeResults = placeSearch.results;

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (active) setReduceTransparency(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const onLocationResolved = useCallback((location: Location.LocationObject) => {
    const nextRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // A second setCamera command emits a normalized-span callback on iOS.
    setRegion((previous) => ({
      ...previous,
      ...nextRegion,
    }));
    setQueryRegion((previous) => ({ ...previous, ...nextRegion }));
    setMapSearchQuery("");
    setMapSearchError(null);
    setIsPlaceDropdownOpen(false);
    setSelectedPlace(null);
    setSelectedPlaceId(null);
    setSelectedPostId(null);
    setSelectedMarkerGroupId(null);
    setSheetLevel("hidden");
    setIsSearchAreaDirty(false);
  }, []);
  const { locationState, requestCurrentLocation } = useMapDeviceLocation(onLocationResolved);

  const sheetHeights = useMemo(
    () => getMapSheetHeights(containerHeight > 0 ? containerHeight : windowHeight),
    [containerHeight, windowHeight],
  );

  const mapPosts = useMemo(
    () => posts?.filter(isRenderableMapPost) ?? [],
    [posts],
  );
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
  const displayMapPosts = useMemo(
    () => ((isLoading || isError) && stableMapPosts.length > 0 ? stableMapPosts : mapPosts)
      .filter((post) => mapModeFilter === "all" || post.interview_mode === mapModeFilter),
    [isError, isLoading, mapModeFilter, mapPosts, stableMapPosts],
  );
  const visibleMapPosts = useMemo(
    () => getPostsInMapRegion(displayMapPosts, region),
    [displayMapPosts, region],
  );
  const markerItems = useMemo(() => buildMapMarkerItems(visibleMapPosts), [visibleMapPosts]);
  const selectedPost = useMemo(
    () => visibleMapPosts.find((post) => post.id === selectedPostId) ?? null,
    [visibleMapPosts, selectedPostId],
  );
  const selectedMarkerGroup = useMemo(
    () =>
      markerItems.find((item): item is Extract<MapMarkerItem, { type: "group" }> => (
        item.type === "group" && item.id === selectedMarkerGroupId
      )) ?? null,
    [markerItems, selectedMarkerGroupId],
  );
  const sheetPosts = selectedMarkerGroup ? selectedMarkerGroup.posts : visibleMapPosts;
  useEffect(() => {
    if (posts !== undefined && !isLoading && !isError) {
      setStableMapPosts(mapPosts);
    }
  }, [isError, isLoading, mapPosts, posts]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (selectedPostId && !visibleMapPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(null);
    }

    if (selectedMarkerGroupId && !markerItems.some((item) => item.type === "group" && item.id === selectedMarkerGroupId)) {
      setSelectedMarkerGroupId(null);
    }
  }, [visibleMapPosts, isLoading, markerItems, selectedMarkerGroupId, selectedPostId]);

  useEffect(() => {
    if (sheetLevel === "hidden") {
      setSelectedPostId(null);
      setSelectedMarkerGroupId(null);
      sheetScrollRef.current?.scrollTo({ animated: false, y: 0 });
      return;
    }
    const animation = Animated.timing(animatedSheetHeight, {
      toValue: sheetHeights[sheetLevel],
      duration: reduceMotion ? 0 : motion.sheet,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animatedSheetHeight, sheetHeights, sheetLevel, reduceMotion]);

  useEffect(() => {
    const animation = Animated.timing(sheetVisibility, {
      toValue: isSheetHidden ? 1 : 0,
      duration: reduceMotion ? 0 : motion.standard,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isSheetHidden, reduceMotion, sheetVisibility]);

  const resetMapSelection = useCallback(() => {
    setIsPlaceDropdownOpen(false);
    setSelectedPlace(null);
    setSelectedPlaceId(null);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setSheetLevel("hidden");
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
    setSheetLevel("hidden");
    sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);

  const handleMapPress = useCallback(() => {
    if (Date.now() < ignoreMapPressUntilRef.current) {
      return;
    }

    if (!selectedMarkerGroupId && !selectedPostId && !isPlaceDropdownOpen) {
      if (sheetLevel !== "hidden") {
        setSheetLevel("hidden");
        sheetScrollRef.current?.scrollTo({ animated: true, y: 0 });
      }
      return;
    }

    clearMapSelectionToNearby();
  }, [clearMapSelectionToNearby, isPlaceDropdownOpen, selectedMarkerGroupId, selectedPostId, sheetLevel]);

  const settleSheetLevel = useCallback((nextLevel: MapSheetLevel) => {
    if (nextLevel !== sheetLevel) {
      setSheetLevel(nextLevel);
      return;
    }

    Animated.timing(animatedSheetHeight, {
      toValue: sheetHeights[nextLevel],
      duration: reduceMotion ? 0 : motion.sheet,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedSheetHeight, reduceMotion, sheetHeights, sheetLevel]);

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
          settleSheetLevel(nextLevel);
        },
        onPanResponderTerminate: (_, gestureState) => {
          const releaseHeight = clampMapSheetHeight(dragStartHeightRef.current - gestureState.dy, sheetHeights);
          didDragRef.current = false;
          settleSheetLevel(getNearestMapSheetLevel(releaseHeight, sheetHeights));
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [animatedSheetHeight, sheetHeights, sheetLevel, settleSheetLevel],
  );

  const focusPostInUsableMapArea = useCallback((post: InterviewPost) => {
    if (!hasMapCoordinates(post)) {
      return;
    }

    const visibleMapHeight = Math.max(1, containerHeight - tabBarHeight);
    const visibleSheetHeight = sheetLevel === "hidden" ? sheetHeights.mid : sheetHeights[sheetLevel];
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
      setSheetLevel((currentLevel) => (currentLevel === "hidden" ? "mid" : currentLevel));
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
    setSheetLevel("mid");
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
    setSheetLevel("hidden");
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
    setSheetLevel("hidden");
    setQueryRegion(region);
    setIsSearchAreaDirty(false);
  }, [region]);

  const mapBannerCopy = getMapBannerCopy(locationState, isError, stableMapPosts.length > 0);
  const showBlockingState = sheetPosts.length === 0;
  const sheetTitle = selectedMarkerGroup ? getMarkerGroupSheetTitle(selectedMarkerGroup) : "근처 공고";
  const sheetCount = sheetPosts.length;
  const unselectedSheetPosts = sheetPosts.filter((post) => post.id !== selectedPostId);
  const listButtonLabel = isLoading && displayMapPosts.length === 0
    ? "목록 불러오는 중"
    : isError && displayMapPosts.length === 0 ? "목록 다시 시도" : `목록 ${visibleMapPosts.length}개`;

  const openNearbyList = () => {
    Keyboard.dismiss();
    setIsPlaceDropdownOpen(false);
    setSelectedMarkerGroupId(null);
    setSelectedPostId(null);
    setSheetLevel("mid");
    sheetScrollRef.current?.scrollTo({ animated: false, y: 0 });
  };

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
                onPress={searchThisArea}
                style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
              >
                <MapControlSurface glassAvailable={glassAvailable}>
                  <View className="min-h-11 flex-row items-center gap-1.5 px-3.5">
                    <Feather color={colors.brand} name="search" size={15} />
                    <Text className="text-xs font-semibold text-hypo-brand">이 지역에서 검색</Text>
                  </View>
                </MapControlSurface>
              </Pressable>
            ) : null}
            {mapBannerCopy ? <MapBanner title={mapBannerCopy} /> : null}
          </View>

          <MapSearchOverlay
            glassAvailable={glassAvailable}
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
              setSheetLevel("hidden");
            }}
            onSubmit={submitMapSearch}
          />
        </View>
      </View>

      {isSheetHidden && !isPlaceDropdownOpen ? (
        <View className="absolute inset-x-0 z-20 items-center" pointerEvents="box-none" style={{ bottom: tabBarHeight + 16 }}>
          <SwiftUIGlassHeaderButton
            glassAvailable={glassAvailable}
            label={listButtonLabel}
            systemImage="list.bullet"
            accessibilityLabel={`${listButtonLabel}, 공고 목록 열기`}
            onPress={openNearbyList}
          />
        </View>
      ) : null}

      <Animated.View
        className="absolute inset-x-0 bottom-0 z-30"
        pointerEvents={isSheetHidden ? "none" : "box-none"}
        accessibilityElementsHidden={isSheetHidden}
        importantForAccessibility={isSheetHidden ? "no-hide-descendants" : "auto"}
        style={{ transform: [{ translateY: sheetVisibility.interpolate({
          inputRange: [0, 1],
          outputRange: [0, sheetHeights.max + tabBarHeight + 16],
        }) }] }}
      >
        <Animated.View
          style={{
            // The sheet surface reaches the screen edge; only its content clears the tabs.
            height: Animated.add(animatedSheetHeight, tabBarHeight),
            paddingBottom: tabBarHeight,
            elevation: 0,
          }}
          className="overflow-hidden rounded-t-[24px] border-t border-hypo-border bg-hypo-surface shadow-sm shadow-black/5"
        >
          <View className="flex-row items-start">
          <View
            {...sheetPanResponder.panHandlers}
            className="flex-1"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`${sheetTitle} ${sheetCount}개, 목록 높이`}
            accessibilityHint="위로 쓸어올리면 목록을 펼치고 아래로 쓸어내리면 닫아요."
            accessibilityValue={{ text: { hidden: "닫힘", mid: "중간", max: "크게 펼침" }[sheetLevel] }}
            accessibilityActions={[{ name: "increment", label: "목록 펼치기" }, { name: "decrement", label: "목록 접기" }]}
            onAccessibilityAction={({ nativeEvent }) => {
              if (nativeEvent.actionName === "increment") setSheetLevel(getHigherMapSheetLevel(sheetLevel));
              if (nativeEvent.actionName === "decrement") setSheetLevel(getLowerMapSheetLevel(sheetLevel));
            }}
          >
            <View className="items-center py-2.5">
              <View className="h-1.5 w-11 rounded-full bg-hypo-border" />
            </View>
            <View className="flex-row items-center justify-between gap-3 px-4 pb-3">
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-black text-hypo-text">{sheetTitle}</Text>
              </View>
              <Text className="text-xs font-semibold text-hypo-muted">{sheetCount}개</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공고 목록 닫기"
            className="mr-2 mt-2 h-12 w-12 items-center justify-center"
            onPress={clearMapSelectionToNearby}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="x" size={20} color={colors.textSecondary} />
          </Pressable>
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

                {unselectedSheetPosts.map((post) => (
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
      </Animated.View>

    </View>
  );
}
