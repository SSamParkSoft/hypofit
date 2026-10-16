import type { ApiRequestInit } from "@/shared/api/client";

// Capability values belong to the deployed API contract, not source-file naming.
export const POSTING_FEATURES_HEADER = "X-Hypofit-Features";
export const POSTING_RECRUITMENT_TYPES_CAPABILITY = "recruitment-types-v1";
export const RESEARCH_RECRUITMENT_CAPABILITY = "research-recruitment-v1";

export function withPostingFeatures(init?: ApiRequestInit): ApiRequestInit {
  const headers = new Headers(init?.headers);
  headers.set(
    POSTING_FEATURES_HEADER,
    `${POSTING_RECRUITMENT_TYPES_CAPABILITY},${RESEARCH_RECRUITMENT_CAPABILITY}`,
  );

  return {
    ...init,
    headers: Object.fromEntries(headers.entries()),
  };
}
