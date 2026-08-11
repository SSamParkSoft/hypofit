import type { InterviewPost } from "../../../shared/api/types";
import type { KakaoLatLng, KakaoLatLngBounds } from "../../../shared/map/kakaoMapLoader";

export type MapFilter = "all" | "offline" | "both";
export type SheetLevel = "collapsed" | "mid" | "expanded";
export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface SearchCenter {
  lat: number;
  lng: number;
  source: "current" | "map";
}

export interface MapPostView {
  area: string;
  distance: string;
  lat: number;
  lng: number;
  post: InterviewPost;
}

export interface MapViewportSearch {
  lat: number;
  lng: number;
  radiusM: number;
}

export const mapFilters: Array<{ label: string; value: MapFilter }> = [
  { label: "전체", value: "all" },
  { label: "대면", value: "offline" },
  { label: "대면·화상", value: "both" },
];

export const fallbackLocation = {
  area: "한양대 ERICA",
  distance: "거리 확인 전",
  lat: 37.296513,
  lng: 126.83708,
};

export const defaultSearchCenter: SearchCenter = {
  lat: fallbackLocation.lat,
  lng: fallbackLocation.lng,
  source: "map",
};

export const defaultRadiusM = 3000;
export const mapSearchDebounceMs = 350;
export const sheetMinHeightPx = 96;
export const sheetDragClickThresholdPx = 6;

const minMapRadiusM = 800;
const maxMapRadiusM = 20000;
const mapSearchCenterThresholdM = 80;
const mapCameraCenterThresholdM = 1;
const sheetMidHeightVh = 42;
const sheetMidMinHeightPx = 286;
const sheetMaxViewportRatio = 0.82;
const sheetMaxTopGapPx = 96;
const sheetMaxBottomReservePx = 16;
const sheetUpwardSnapThresholdPx = 28;

export function buildMapPostViews(posts: InterviewPost[], activeFilter: MapFilter): MapPostView[] {
  const offlineCapablePosts = posts.filter(
    (post) => hasPostCoordinates(post) && post.interview_mode !== "online",
  );

  const views = offlineCapablePosts.map<MapPostView>((post) => {
    const location = resolveMapLocation(post);
    return {
      area: location.area,
      distance: formatMapDistance(post.distance_meters, location.distance),
      lat: location.lat,
      lng: location.lng,
      post,
    };
  });

  return views.filter((view) => {
    if (activeFilter === "offline") {
      return view.post.interview_mode === "offline";
    }

    if (activeFilter === "both") {
      return view.post.interview_mode === "both";
    }

    return true;
  });
}

export function resolveMapLocation(post: InterviewPost) {
  const location = post.location_text || post.location;

  if (hasPostCoordinates(post)) {
    return {
      area: normalizeMapArea(location) || fallbackLocation.area,
      distance: fallbackLocation.distance,
      lat: post.location_latitude,
      lng: post.location_longitude,
    };
  }

  return {
    ...fallbackLocation,
    area: normalizeMapArea(location) || fallbackLocation.area,
  };
}

export function hasPostCoordinates(
  post: InterviewPost,
): post is InterviewPost & { location_latitude: number; location_longitude: number } {
  return (
    typeof post.location_latitude === "number" &&
    Number.isFinite(post.location_latitude) &&
    typeof post.location_longitude === "number" &&
    Number.isFinite(post.location_longitude)
  );
}

export function isKoreaCoordinate(coordinate: Pick<SearchCenter, "lat" | "lng">) {
  return (
    coordinate.lat >= 33 &&
    coordinate.lat <= 39 &&
    coordinate.lng >= 124 &&
    coordinate.lng <= 132
  );
}

export function isSameMapSearch(
  searchCenter: SearchCenter | null,
  currentRadiusM: number,
  viewport: MapViewportSearch,
) {
  if (!searchCenter) {
    return false;
  }

  const centerMovedM = getDistanceMeters(
    searchCenter.lat,
    searchCenter.lng,
    viewport.lat,
    viewport.lng,
  );
  const radiusChangedM = Math.abs(currentRadiusM - viewport.radiusM);

  return centerMovedM < mapSearchCenterThresholdM && radiusChangedM < 100;
}

export function formatMapDistance(distanceMeters: number | null, fallback: string) {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return fallback;
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)}km`;
}

export function getRadiusFromBounds(center: KakaoLatLng, bounds: KakaoLatLngBounds) {
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  const horizontalRadius = getDistanceMeters(
    center.getLat(),
    center.getLng(),
    center.getLat(),
    northEast.getLng(),
  );
  const verticalRadius = getDistanceMeters(
    center.getLat(),
    center.getLng(),
    northEast.getLat(),
    center.getLng(),
  );
  const fallbackRadius = getDistanceMeters(
    southWest.getLat(),
    southWest.getLng(),
    northEast.getLat(),
    northEast.getLng(),
  ) / 2;

  return Math.round(
    Math.max(
      minMapRadiusM,
      Math.min(maxMapRadiusM, Math.min(horizontalRadius, verticalRadius) || fallbackRadius),
    ),
  );
}

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusM = 6371000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getMapCameraSyncPlan(
  currentCenter: Pick<SearchCenter, "lat" | "lng">,
  targetCenter: Pick<SearchCenter, "lat" | "lng">,
  previousSelectedPostId: string | null,
  selectedPostId: string | null,
) {
  const shouldMoveCenter =
    getDistanceMeters(
      currentCenter.lat,
      currentCenter.lng,
      targetCenter.lat,
      targetCenter.lng,
    ) >= mapCameraCenterThresholdM;

  return {
    shouldMoveCenter,
    shouldSetLevel: shouldMoveCenter || previousSelectedPostId !== selectedPostId,
  };
}

export function formatMarkerReward(amount: number) {
  return amount.toLocaleString("ko-KR");
}

export function getNextSheetLevel(level: SheetLevel): SheetLevel {
  if (level === "collapsed") {
    return "mid";
  }

  if (level === "mid") {
    return "expanded";
  }

  return "collapsed";
}

export function getSheetHeights(viewportHeight: number): Record<SheetLevel, number> {
  const maxHeight = Math.max(
    sheetMidMinHeightPx,
    Math.min(viewportHeight - sheetMaxTopGapPx, viewportHeight * sheetMaxViewportRatio) -
      sheetMaxBottomReservePx,
  );
  const midHeight = Math.min(
    maxHeight,
    Math.max(sheetMidMinHeightPx, viewportHeight * (sheetMidHeightVh / 100)),
  );

  return {
    collapsed: Math.min(sheetMinHeightPx, midHeight),
    mid: midHeight,
    expanded: maxHeight,
  };
}

export function clampSheetHeight(height: number, sheetHeights: Record<SheetLevel, number>) {
  return Math.max(sheetHeights.collapsed, Math.min(height, sheetHeights.expanded));
}

export function getSettledSheetHeightAfterDrag(
  finalHeight: number,
  deltaY: number,
  sheetHeights: Record<SheetLevel, number>,
) {
  const isUpwardFlick = deltaY < -sheetUpwardSnapThresholdPx;

  if (!isUpwardFlick) {
    return finalHeight;
  }

  if (finalHeight < sheetHeights.mid) {
    return sheetHeights.mid;
  }

  return sheetHeights.expanded;
}

export function getDisplaySheetLevel(
  height: number,
  sheetHeights: Record<SheetLevel, number>,
): SheetLevel {
  const midPoint = (sheetHeights.collapsed + sheetHeights.expanded) / 2;
  const expandedThreshold = sheetHeights.expanded - 32;

  if (height >= expandedThreshold) {
    return "expanded";
  }

  if (height >= midPoint) {
    return "mid";
  }

  return "collapsed";
}

function normalizeMapArea(location: string | null) {
  return location?.replace(/\s*(인근|근처|또는 화상)$/g, "");
}
