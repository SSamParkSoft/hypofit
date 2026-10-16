import type { InterviewPost } from "../api/interview-posts";

type PostingDuration = Pick<InterviewPost,
  "recruitment_type" | "duration_value" | "duration_unit" | "duration_minutes" |
  "beta_test_starts_at" | "beta_test_ends_at">;

export function formatPostingDuration(post: PostingDuration): string | null {
  if (post.duration_value && post.duration_unit) {
    const unit = { minutes: "분", hours: "시간", days: "일", weeks: "주" }[post.duration_unit];
    return `${post.duration_value}${unit}`;
  }
  // Legacy beta rows have a date range but no canonical duration.
  if (post.recruitment_type === "beta_test" && post.beta_test_starts_at && post.beta_test_ends_at) {
    const days = Math.round((Date.parse(post.beta_test_ends_at) - Date.parse(post.beta_test_starts_at)) / 86_400_000);
    if (days > 0) return `${days}일`;
  }
  return post.duration_minutes > 0 ? `${post.duration_minutes}분` : null;
}

export function formatBetaTestPlatforms(platforms: string[] | null | undefined): string {
  const labels: Record<string, string> = { ios: "iOS", android: "Android", web: "Web", other: "기타" };
  return platforms?.map((platform) => labels[platform.trim().toLowerCase()] ?? platform.trim()).join(" · ") || "베타테스트";
}
