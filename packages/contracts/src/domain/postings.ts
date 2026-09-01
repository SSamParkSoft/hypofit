export const postingTypes = [
  "interview",
  "survey",
  "beta_test",
  "usability_test",
  "research_experiment",
  "focus_group",
  "other",
] as const;

export type PostingType = (typeof postingTypes)[number];

export const postingTypeLabels: Record<PostingType, string> = {
  interview: "인터뷰",
  survey: "설문조사",
  beta_test: "베타테스트",
  usability_test: "사용성 테스트",
  research_experiment: "연구 실험",
  focus_group: "좌담회",
  other: "기타",
};

export const compensationTypes = [
  "cash",
  "gift_card",
  "points",
  "product",
  "coupon_or_access",
  "other",
  "none",
] as const;

export type CompensationType = (typeof compensationTypes)[number];

export interface Compensation {
  type: CompensationType;
  label?: string | null;
  amount?: number | null;
  currency?: string | null;
  points?: number | null;
  description?: string | null;
  delivery_method?: string | null;
}

export function legacyRewardAsCompensations(rewardAmount: number | null | undefined): Compensation[] {
  if (!rewardAmount) {
    return [{ type: "none" }];
  }

  return [{ type: "cash", amount: rewardAmount, currency: "KRW" }];
}

export function normalizeCompensations(
  compensations: Compensation[] | null | undefined,
  legacyRewardAmount?: number | null,
): Compensation[] {
  return compensations?.length ? compensations : legacyRewardAsCompensations(legacyRewardAmount);
}

export function formatCompensation(compensation: Compensation): string {
  switch (compensation.type) {
    case "cash": {
      const amount = compensation.amount ?? 0;
      const currency = compensation.currency ?? "KRW";
      return currency === "KRW"
        ? `${new Intl.NumberFormat("ko-KR").format(amount)}원`
        : `${new Intl.NumberFormat("ko-KR").format(amount)} ${currency}`;
    }
    case "points":
      return compensation.points == null
        ? compensation.label?.trim() || "포인트"
        : `${new Intl.NumberFormat("ko-KR").format(compensation.points)}P`;
    case "none":
      return "보상 없음";
    default:
      return compensation.label?.trim() || "보상 제공";
  }
}

export function formatCompensationSummary(compensations: Compensation[] | null | undefined): string {
  const normalized = compensations?.length ? compensations : [{ type: "none" as const }];
  const [first, ...rest] = normalized;
  const firstLabel = formatCompensation(first);

  if (!rest.length) return firstLabel;
  if (rest.length === 1) return `${firstLabel} + ${formatCompensation(rest[0])}`;
  return `${firstLabel} 외 ${rest.length}개`;
}
