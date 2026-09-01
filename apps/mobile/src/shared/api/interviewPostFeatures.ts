import type { ApiRequestInit } from "./client";

export const INTERVIEW_POST_FEATURES_HEADER = "X-Hypofit-Features";
export const INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY = "recruitment-types-v1";

export function withInterviewPostFeatures(init?: ApiRequestInit): ApiRequestInit {
  const headers = new Headers(init?.headers);
  headers.set(
    INTERVIEW_POST_FEATURES_HEADER,
    INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
  );

  return {
    ...init,
    headers: Object.fromEntries(headers.entries()),
  };
}
