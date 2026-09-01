import { normalizeCompensations, type CompensationType, type PostingType } from "@hypofit/contracts";
import type { InterviewMode, InterviewPost } from "../../../shared/api/types";

export type ModeFilter = "all" | InterviewMode;
export type CompensationFilter = "all" | CompensationType;
export type PostingTypeFilter = "all" | PostingType;
export type NearbyStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export const modeFilters: Array<{ label: string; value: ModeFilter }> = [
  { label: "전체", value: "all" },
  { label: "화상", value: "online" },
  { label: "대면", value: "offline" },
  { label: "대면/화상", value: "both" },
];

export const compensationFilters: Array<{ label: string; value: CompensationFilter }> = [
  { label: "전체", value: "all" },
  { label: "현금", value: "cash" },
  { label: "기프티콘 / 상품권", value: "gift_card" },
  { label: "포인트", value: "points" },
  { label: "제품 / 샘플", value: "product" },
  { label: "쿠폰 / 이용권", value: "coupon_or_access" },
  { label: "기타", value: "other" },
  { label: "보상 없음", value: "none" },
];

export const postingTypeFilters: Array<{ label: string; value: PostingTypeFilter }> = [
  { label: "전체", value: "all" },
  { label: "인터뷰", value: "interview" },
  { label: "설문조사", value: "survey" },
  { label: "베타테스트", value: "beta_test" },
  { label: "사용성 테스트", value: "usability_test" },
  { label: "연구 실험", value: "research_experiment" },
  { label: "좌담회", value: "focus_group" },
  { label: "기타", value: "other" },
];

export const nearbyRadiusOptions = [1000, 3000, 5000, 10000, 20000] as const;
export const defaultNearbyRadiusM = 3000;

export interface InterviewsSearchState {
  modeFilter: ModeFilter;
  nearbyCenter: { lat: number; lng: number } | null;
  nearbyRadiusM: number;
  query: string;
  compensationFilter: CompensationFilter;
  postingTypeFilter: PostingTypeFilter;
  selectedPostId: string | null;
}

export function filterInterviewPosts(
  posts: InterviewPost[],
  {
    modeFilter,
    query,
    compensationFilter,
    postingTypeFilter,
  }: Pick<InterviewsSearchState, "modeFilter" | "query" | "compensationFilter" | "postingTypeFilter">,
) {
  return posts.filter((post) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [post.title, post.service_summary, post.target_description, post.location]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    const matchesMode = modeFilter === "all" || post.interview_mode === modeFilter;
    const compensations = normalizeCompensations(post.compensations, post.reward_amount);
    const matchesCompensation = compensationFilter === "all" || compensations.some(
      (compensation) => compensation.type === compensationFilter,
    );
    const matchesType = postingTypeFilter === "all" || (post.recruitment_type ?? "interview") === postingTypeFilter;

    return matchesQuery && matchesMode && matchesCompensation && matchesType;
  });
}

export function buildInterviewsSearchParams({
  modeFilter,
  nearbyCenter,
  nearbyRadiusM,
  query,
  compensationFilter,
  postingTypeFilter,
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

  if (compensationFilter !== "all") {
    params.set("compensation", compensationFilter);
  }

  if (postingTypeFilter !== "all") {
    params.set("type", postingTypeFilter);
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
      compensationFilter: "all",
      postingTypeFilter: "all",
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
  const compensation = params.get("compensation");
  const type = params.get("type");
  const nearbyCenter = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const selectedPostId = params.get("post");

  return {
    modeFilter: isModeFilterValue(mode) ? mode : "all",
    nearbyCenter,
    nearbyRadiusM: nearbyRadiusOptions.includes(radius as (typeof nearbyRadiusOptions)[number])
      ? radius
      : defaultNearbyRadiusM,
    query: params.get("q") ?? "",
    compensationFilter: isCompensationFilterValue(compensation) ? compensation : "all",
    postingTypeFilter: isPostingTypeFilterValue(type) ? type : "all",
    selectedPostId: selectedPostId ? selectedPostId : null,
  };
}

export function formatRadius(radiusM: number) {
  return radiusM < 1000 ? `${radiusM}m` : `${radiusM / 1000}km`;
}

function isModeFilterValue(value: string | null): value is ModeFilter {
  return modeFilters.some((filter) => filter.value === value);
}

function isCompensationFilterValue(value: string | null): value is CompensationFilter {
  return compensationFilters.some((filter) => filter.value === value);
}

function isPostingTypeFilterValue(value: string | null): value is PostingTypeFilter {
  return postingTypeFilters.some((filter) => filter.value === value);
}
