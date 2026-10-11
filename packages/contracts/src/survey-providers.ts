import type { SurveyExternalProvider } from "./api/interview-posts";

export const surveyProviderOptions: ReadonlyArray<{ value: SurveyExternalProvider; label: string }> = [
  { value: "google_forms", label: "Google Forms" },
  { value: "naver_forms", label: "네이버 폼" },
  { value: "microsoft_forms", label: "Microsoft Forms" },
  { value: "typeform", label: "Typeform" },
  { value: "tally", label: "Tally" },
  { value: "external", label: "기타" },
];

export function getSurveyProviderLabel(provider?: SurveyExternalProvider | null): string {
  return surveyProviderOptions.find((option) => option.value === provider)?.label ?? "기타";
}
