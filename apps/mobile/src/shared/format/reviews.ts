import type { FounderReviewSummary } from "@hypofit/contracts";

export function formatFounderReviewSummary(
  summary?: FounderReviewSummary | null,
  options?: { minimumCount?: number },
) {
  const minimumCount = options?.minimumCount ?? 1;
  const reviewCount = summary?.review_count ?? 0;

  if (!summary || reviewCount < minimumCount) {
    return null;
  }

  if (summary.average_rating == null) {
    return `후기 ${reviewCount}개`;
  }

  return `★ ${summary.average_rating.toFixed(1)} · 후기 ${reviewCount}개`;
}
