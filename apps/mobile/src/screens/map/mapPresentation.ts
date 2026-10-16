import type { InterviewPost } from "@hypofit/contracts";
import { getPostingCompensationLabel } from "@/features/postings/postingPresentation";
import type { LocationState, MapMarkerItem } from "./mapTypes";

export function getMapBannerCopy(
  locationState: LocationState,
  isError: boolean,
  hasStablePosts: boolean,
) {
  if (locationState === "denied") {
    return "위치 권한을 켜면 내 주변 공고를 볼 수 있어요.";
  }

  if (isError && hasStablePosts) {
    return "공고를 다시 불러오지 못했어요.";
  }

  return null;
}

export function getPostLocationLabel(post: InterviewPost) {
  return post.location_place_name ?? post.location_text ?? post.location ?? "장소 협의";
}

export function getMarkerGroupSheetTitle(group: Extract<MapMarkerItem, { type: "group" }>) {
  const [firstPost] = group.posts;
  const placeName = firstPost?.location_place_name ?? firstPost?.location_text ?? firstPost?.location;

  return placeName?.trim() || "이 위치의 공고";
}

export function getMapMarkerCompensationLabel(post: InterviewPost) {
  const label = getPostingCompensationLabel(post);

  return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

export function formatMapDistance(distanceMeters: number | null, fallback = "") {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return fallback;
  }

  if (distanceMeters < 1000) {
    return `${Math.max(1, Math.round(distanceMeters))}m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)}km`;
}
