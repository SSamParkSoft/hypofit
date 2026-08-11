import { useEffect, useRef, useState } from "react";

import type {
  KakaoCustomOverlay,
  KakaoMap,
  KakaoMapsGlobal,
} from "../../../shared/map/kakaoMapLoader";
import { loadKakaoMaps } from "../../../shared/map/kakaoMapLoader";
import { ErrorState, LoadingState } from "../../../shared/ui/state";
import type { MapPostView, MapViewportSearch, SearchCenter } from "../model/mapPageModel";
import {
  fallbackLocation,
  formatMarkerReward,
  getMapCameraSyncPlan,
  getRadiusFromBounds,
} from "../model/mapPageModel";

export interface KakaoMapCanvasProps {
  currentLocation: SearchCenter | null;
  onMapViewportChange: (viewport: MapViewportSearch) => void;
  onSelect: (postId: string) => void;
  searchCenter: SearchCenter | null;
  selectedPostId: string | null;
  viewedPostIds: Set<string>;
  views: MapPostView[];
}

export function KakaoMapCanvas({
  currentLocation,
  onMapViewportChange,
  onSelect,
  searchCenter,
  selectedPostId,
  viewedPostIds,
  views,
}: KakaoMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const previousSelectedPostIdRef = useRef<string | null>(null);
  const [kakaoMaps, setKakaoMaps] = useState<KakaoMapsGlobal | null>(null);
  const [sdkStatus, setSdkStatus] = useState<"idle" | "loading" | "ready" | "missing_key" | "failed">("idle");
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;

  useEffect(() => {
    let isMounted = true;

    if (!appKey) {
      setSdkStatus("missing_key");
      return;
    }

    setSdkStatus("loading");
    loadKakaoMaps(appKey)
      .then((maps) => {
        if (!isMounted) {
          return;
        }
        setKakaoMaps(maps);
        setSdkStatus("ready");
      })
      .catch(() => {
        if (isMounted) {
          setSdkStatus("failed");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [appKey]);

  useEffect(() => {
    if (!containerRef.current || !kakaoMaps || sdkStatus !== "ready") {
      return;
    }

    const selectedView = views.find((view) => view.post.id === selectedPostId);
    const center = new kakaoMaps.maps.LatLng(
      selectedView?.lat ?? searchCenter?.lat ?? views[0]?.lat ?? fallbackLocation.lat,
      selectedView?.lng ?? searchCenter?.lng ?? views[0]?.lng ?? fallbackLocation.lng,
    );
    const level = selectedPostId ? 4 : searchCenter ? 5 : 6;

    if (!mapRef.current) {
      mapRef.current = new kakaoMaps.maps.Map(containerRef.current, {
        center,
        level,
      });
    } else {
      const map = mapRef.current;
      map.relayout();
      const activeCenter = map.getCenter();
      const cameraSyncPlan = getMapCameraSyncPlan(
        { lat: activeCenter.getLat(), lng: activeCenter.getLng() },
        { lat: center.getLat(), lng: center.getLng() },
        previousSelectedPostIdRef.current,
        selectedPostId,
      );

      if (cameraSyncPlan.shouldMoveCenter) {
        map.setCenter(center);
      }

      if (cameraSyncPlan.shouldSetLevel) {
        map.setLevel(level);
      }
    }

    previousSelectedPostIdRef.current = selectedPostId;
  }, [kakaoMaps, sdkStatus, searchCenter, selectedPostId, views]);

  useEffect(() => {
    if (!kakaoMaps || !mapRef.current || sdkStatus !== "ready") {
      return;
    }

    const map = mapRef.current;
    const handleViewportChange = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onMapViewportChange({
        lat: center.getLat(),
        lng: center.getLng(),
        radiusM: getRadiusFromBounds(center, bounds),
      });
    };

    kakaoMaps.maps.event.addListener(map, "idle", handleViewportChange);

    return () => {
      kakaoMaps.maps.event.removeListener(map, "idle", handleViewportChange);
    };
  }, [kakaoMaps, onMapViewportChange, sdkStatus]);

  useEffect(() => {
    if (!kakaoMaps || !mapRef.current || sdkStatus !== "ready") {
      return;
    }

    const overlays: KakaoCustomOverlay[] = views.map((view) => {
      const isSelected = view.post.id === selectedPostId;
      const isViewed = viewedPostIds.has(view.post.id);
      const content = createMapMarkerElement({
        area: view.area,
        isSelected,
        isViewed,
        onSelect: () => onSelect(view.post.id),
        reward: formatMarkerReward(view.post.reward_amount),
        title: view.post.title,
      });

      return new kakaoMaps.maps.CustomOverlay({
        clickable: true,
        content,
        map: mapRef.current as KakaoMap,
        position: new kakaoMaps.maps.LatLng(view.lat, view.lng),
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: isSelected ? 20 : isViewed ? 8 : 10,
      });
    });

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [kakaoMaps, onSelect, sdkStatus, selectedPostId, viewedPostIds, views]);

  useEffect(() => {
    if (!currentLocation || !kakaoMaps || !mapRef.current || sdkStatus !== "ready") {
      return;
    }

    const overlay = new kakaoMaps.maps.CustomOverlay({
      clickable: false,
      content: createCurrentLocationMarkerElement(),
      map: mapRef.current,
      position: new kakaoMaps.maps.LatLng(currentLocation.lat, currentLocation.lng),
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 30,
    });

    return () => overlay.setMap(null);
  }, [currentLocation, kakaoMaps, sdkStatus]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      {sdkStatus === "loading" || sdkStatus === "idle" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#edf1ec] px-5">
          <LoadingState title="지도를 불러오는 중입니다." />
        </div>
      ) : null}

      {sdkStatus === "missing_key" || sdkStatus === "failed" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#edf1ec] px-5">
          <ErrorState title="지도를 표시하지 못했습니다.">
            Kakao Maps 설정과 등록된 도메인을 확인하세요.
          </ErrorState>
        </div>
      ) : null}

    </div>
  );
}

function createMapMarkerElement({
  area,
  isSelected,
  isViewed,
  onSelect,
  reward,
  title,
}: {
  area: string;
  isSelected: boolean;
  isViewed: boolean;
  onSelect: () => void;
  reward: string;
  title: string;
}) {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.setAttribute("aria-label", `${area} ${title} 보기`);
  wrapper.className = "group grid -translate-y-2 place-items-center focus-visible:outline-none";
  wrapper.addEventListener("click", onSelect);

  const bubble = document.createElement("span");
  bubble.className = [
    "relative grid min-h-8 min-w-[68px] place-items-center rounded-hypo-pill border px-3 text-[11px] font-black tabular-nums transition-[background-color,border-color,color,transform,box-shadow]",
    "after:absolute after:left-1/2 after:top-[calc(100%-1px)] after:size-2.5 after:-translate-x-1/2 after:rotate-45 after:border-b after:border-r after:content-['']",
    isSelected
      ? "min-h-9 scale-110 border-hypo-brand-strong bg-hypo-brand px-3.5 text-white shadow-[0_14px_30px_rgb(23_107_93_/_0.32)] after:border-hypo-brand-strong after:bg-hypo-brand"
      : isViewed
        ? "border-[#d8e3df]/80 bg-white/75 text-hypo-text-soft shadow-[0_7px_16px_rgb(29_37_34_/_0.09)] after:border-[#d8e3df]/80 after:bg-white/75 group-hover:scale-105 group-hover:border-hypo-brand/35 group-hover:text-hypo-brand"
        : "border-[#d8e3df] bg-white text-hypo-brand shadow-[0_9px_20px_rgb(29_37_34_/_0.13)] after:border-[#d8e3df] after:bg-white group-hover:scale-105 group-hover:border-hypo-brand/45 group-hover:text-hypo-brand-strong",
  ].join(" ");
  bubble.textContent = reward;

  const dot = document.createElement("span");
  dot.className = [
    "mt-2 block rounded-full transition-[background-color,transform]",
    isSelected
      ? "size-2 bg-hypo-brand shadow-[0_0_0_3px_rgb(23_107_93_/_0.14)]"
      : isViewed
        ? "size-1.5 bg-hypo-text-soft/25"
        : "size-1.5 bg-hypo-brand/30",
  ].join(" ");

  const label = document.createElement("span");
  label.className = [
    "pointer-events-none mt-0.5 hidden whitespace-nowrap rounded-hypo-pill px-2 py-0.5 text-[10px] font-black shadow-sm sm:block",
    isSelected
      ? "bg-hypo-brand text-white"
      : isViewed
        ? "bg-white/85 text-hypo-text-soft backdrop-blur"
        : "bg-hypo-brand-soft/95 text-hypo-brand backdrop-blur",
  ].join(" ");
  label.textContent = area;

  wrapper.append(bubble, dot, label);
  return wrapper;
}

function createCurrentLocationMarkerElement() {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-label", "현재 위치");
  wrapper.className = "relative grid size-9 place-items-center";

  const pulse = document.createElement("span");
  pulse.className =
    "absolute size-9 rounded-full bg-[#2f7df6]/20 shadow-[0_0_0_1px_rgb(47_125_246_/_0.12)]";

  const ring = document.createElement("span");
  ring.className =
    "absolute size-5 rounded-full border-2 border-white bg-[#2f7df6] shadow-[0_8px_18px_rgb(47_125_246_/_0.35)]";

  const core = document.createElement("span");
  core.className = "absolute size-2 rounded-full bg-white";

  wrapper.append(pulse, ring, core);
  return wrapper;
}
