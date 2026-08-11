import { apiRequest, type ApiRequestInit } from "./client";
import type { InterviewPostView, InterviewPostViewSource } from "./types";

export interface MarkInterviewPostViewedInput {
  postId: string;
  source: InterviewPostViewSource;
}

const interviewPostViewsCollectionPath = "/api/v1/interview-post-views/";

export const interviewPostViewRoutes = {
  collection: interviewPostViewsCollectionPath,
  markViewed: (postId: string) =>
    `/api/v1/interview-posts/${encodeURIComponent(postId)}/view`,
} as const;

export function listInterviewPostViews(
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<InterviewPostView[]> {
  return apiRequest<InterviewPostView[]>(interviewPostViewRoutes.collection, {
    ...init,
    accessToken,
  });
}

export function markInterviewPostViewed(
  input: MarkInterviewPostViewedInput,
  accessToken?: string | null,
): Promise<InterviewPostView> {
  return apiRequest<InterviewPostView>(interviewPostViewRoutes.markViewed(input.postId), {
    method: "POST",
    accessToken,
    body: JSON.stringify({ source: input.source }),
  });
}

export const interviewPostViewsApi = {
  list: listInterviewPostViews,
  markViewed: markInterviewPostViewed,
} as const;
