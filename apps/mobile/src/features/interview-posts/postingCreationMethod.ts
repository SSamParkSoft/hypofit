import type { DurationUnit } from "./postingCreationDraft";

const durationMultipliers: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

export function getPostingDurationError(type: string, value: string, unit: DurationUnit): string | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    return "예상 시간은 1 이상 999 이하의 정수로 입력해 주세요.";
  }
  const minutes = number * durationMultipliers[unit];
  if (type === "beta_test") {
    return !Number.isFinite(minutes) || minutes < 10 || minutes > 525600
      ? "예상 참여 기간은 10분 이상 1년 이하로 입력해 주세요."
      : null;
  }
  return minutes < 10 || minutes > 240
    ? "예상 시간은 10분에서 4시간 사이로 입력해 주세요."
    : null;
}

export function isGoogleFormsParticipationUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && (
      url.hostname === "forms.gle" ||
      (url.hostname === "docs.google.com" && url.pathname.startsWith("/forms/"))
    );
  } catch {
    return false;
  }
}
