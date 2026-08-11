import type { InterviewPostView, InterviewPostViewSource } from "@hypofit/contracts";
import { apiRequest } from "./client";

export interface MarkInterviewPostViewedInput {
  postId: string;
  source: InterviewPostViewSource;
}

const interviewPostViewsCollectionPath = "/api/v1/interview-post-views/";

export const interviewPostViewRoutes = {
  collection: interviewPostViewsCollectionPath,
  markViewed: (postId: string) => `/api/v1/interview-posts/${encodeURIComponent(postId)}/view`,
} as const;

export const interviewPostViewsApi = {
  list(accessToken?: string | null) {
    return apiRequest<InterviewPostView[]>(interviewPostViewRoutes.collection, { accessToken });
  },
  markViewed(input: MarkInterviewPostViewedInput, accessToken?: string | null) {
    return apiRequest<InterviewPostView>(interviewPostViewRoutes.markViewed(input.postId), {
      method: "POST",
      accessToken,
      body: JSON.stringify({ source: input.source }),
    });
  },
} as const;
