import type { InterviewPostView, InterviewPostViewSource } from "@hypofit/contracts";
import { apiRequest } from "@/shared/api/client";

export interface MarkPostingViewedInput {
  postId: string;
  source: InterviewPostViewSource;
}

const postingViewsCollectionPath = "/api/v1/interview-post-views/";

export const postingViewRoutes = {
  collection: postingViewsCollectionPath,
  markViewed: (postId: string) => `/api/v1/interview-posts/${encodeURIComponent(postId)}/view`,
} as const;

export const postingViewsApi = {
  list(accessToken?: string | null) {
    return apiRequest<InterviewPostView[]>(postingViewRoutes.collection, { accessToken });
  },
  markViewed(input: MarkPostingViewedInput, accessToken?: string | null) {
    return apiRequest<InterviewPostView>(postingViewRoutes.markViewed(input.postId), {
      method: "POST",
      accessToken,
      body: JSON.stringify({ source: input.source }),
    });
  },
} as const;
