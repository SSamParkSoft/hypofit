import { type DurationUnit } from "@/features/postings/postingCreationDraft";

export const durationUnits: Array<{ value: DurationUnit; label: string }> = [
  { value: "minutes", label: "분" },
  { value: "hours", label: "시간" },
];

export const betaDurationUnits: Array<{ value: DurationUnit; label: string }> = [
  { value: "days", label: "일" },
  { value: "weeks", label: "주" },
  ...durationUnits,
];
