import type { InterviewMode, InterviewPost } from "../../../shared/api/types";

export type ModeFilter = "all" | InterviewMode;
export type RewardFilter = "all" | "10000" | "15000" | "20000";
export type NearbyStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export const modeFilters: Array<{ label: string; value: ModeFilter }> = [
  { label: "전체", value: "all" },
  { label: "화상", value: "online" },
  { label: "대면", value: "offline" },
  { label: "대면/화상", value: "both" },
];

export const rewardFilters: Array<{ label: string; value: RewardFilter }> = [
  { label: "전체 사례비", value: "all" },
  { label: "1만원 이상", value: "10000" },
  { label: "1.5만원 이상", value: "15000" },
  { label: "2만원 이상", value: "20000" },
];

export const nearbyRadiusOptions = [1000, 3000, 5000, 10000, 20000] as const;
export const defaultNearbyRadiusM = 3000;

export interface InterviewsSearchState {
  modeFilter: ModeFilter;
  nearbyCenter: { lat: number; lng: number } | null;
  nearbyRadiusM: number;
  query: string;
  rewardFilter: RewardFilter;
  selectedPostId: string | null;
}

export function filterInterviewPosts(
  posts: InterviewPost[],
  {
    modeFilter,
    query,
    rewardFilter,
  }: Pick<InterviewsSearchState, "modeFilter" | "query" | "rewardFilter">,
) {
  return posts.filter((post) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [post.title, post.service_summary, post.target_description, post.location]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    const matchesMode = modeFilter === "all" || post.interview_mode === modeFilter;
    const minimumReward = rewardFilter === "all" ? 0 : Number(rewardFilter);
    const matchesReward = post.reward_amount >= minimumReward;

    return matchesQuery && matchesMode && matchesReward;
  });
}

export function buildInterviewsSearchParams({
  modeFilter,
  nearbyCenter,
  nearbyRadiusM,
  query,
  rewardFilter,
  selectedPostId,
}: InterviewsSearchState) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (modeFilter !== "all") {
    params.set("mode", modeFilter);
  }

  if (rewardFilter !== "all") {
    params.set("reward", rewardFilter);
  }

  if (selectedPostId) {
    params.set("post", selectedPostId);
  }

  if (nearbyCenter) {
    params.set("lat", nearbyCenter.lat.toFixed(5));
    params.set("lng", nearbyCenter.lng.toFixed(5));
    params.set("radius", String(nearbyRadiusM));
  }

  return params;
}

export function readInterviewsSearchStateFromUrl(): InterviewsSearchState {
  if (typeof window === "undefined") {
    return {
      modeFilter: "all",
      nearbyCenter: null,
      nearbyRadiusM: defaultNearbyRadiusM,
      query: "",
      rewardFilter: "all",
      selectedPostId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const lat = latParam === null ? Number.NaN : Number(latParam);
  const lng = lngParam === null ? Number.NaN : Number(lngParam);
  const radius = Number(params.get("radius"));
  const mode = params.get("mode");
  const reward = params.get("reward");
  const nearbyCenter = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const selectedPostId = params.get("post");

  return {
    modeFilter: isModeFilterValue(mode) ? mode : "all",
    nearbyCenter,
    nearbyRadiusM: nearbyRadiusOptions.includes(radius as (typeof nearbyRadiusOptions)[number])
      ? radius
      : defaultNearbyRadiusM,
    query: params.get("q") ?? "",
    rewardFilter: isRewardFilterValue(reward) ? reward : "all",
    selectedPostId: selectedPostId ? selectedPostId : null,
  };
}

export function formatRadius(radiusM: number) {
  return radiusM < 1000 ? `${radiusM}m` : `${radiusM / 1000}km`;
}

function isModeFilterValue(value: string | null): value is ModeFilter {
  return modeFilters.some((filter) => filter.value === value);
}

function isRewardFilterValue(value: string | null): value is RewardFilter {
  return rewardFilters.some((filter) => filter.value === value);
}
