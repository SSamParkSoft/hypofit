import type {
  CreateInterviewPostInput,
  InterviewMode,
  InterviewPost,
  InterviewPostStatus,
} from "@hypofit/contracts";
import { ApiError, apiGet, apiRequest } from "./client";

export interface ListInterviewPostsParams {
  status?: InterviewPostStatus;
  mode?: InterviewMode;
  founderId?: string;
  q?: string;
  rewardMin?: number;
  rewardMax?: number;
  lat?: number;
  lng?: number;
  radiusM?: number;
  sort?: "newest" | "distance" | "reward";
  limit?: number;
}

const interviewPostsCollectionPath = "/api/v1/interview-posts/";

function buildInterviewPostsPath(params?: ListInterviewPostsParams): string {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.set("status", params.status);
  if (params?.mode) searchParams.set("mode", params.mode);
  if (params?.founderId) searchParams.set("founder_id", params.founderId);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.rewardMin !== undefined) searchParams.set("reward_min", String(params.rewardMin));
  if (params?.rewardMax !== undefined) searchParams.set("reward_max", String(params.rewardMax));
  if (params?.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params?.lng !== undefined) searchParams.set("lng", String(params.lng));
  if (params?.radiusM !== undefined) searchParams.set("radius_m", String(params.radiusM));
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${interviewPostsCollectionPath}?${queryString}` : interviewPostsCollectionPath;
}

export const interviewPostRoutes = {
  collection: interviewPostsCollectionPath,
  detail: (interviewPostId: string) =>
    `${interviewPostsCollectionPath}${encodeURIComponent(interviewPostId)}`,
  status: (interviewPostId: string) =>
    `${interviewPostRoutes.detail(interviewPostId)}/status`,
  archive: (interviewPostId: string) =>
    `${interviewPostRoutes.detail(interviewPostId)}/archive`,
  reopen: (interviewPostId: string) =>
    `${interviewPostRoutes.detail(interviewPostId)}/reopen`,
} as const;

export const interviewPostsApi = {
  list(params?: ListInterviewPostsParams) {
    return apiGet<InterviewPost[]>(buildInterviewPostsPath(params));
  },
  listForUser(params?: ListInterviewPostsParams, accessToken?: string | null) {
    return apiGet<InterviewPost[]>(buildInterviewPostsPath(params), accessToken);
  },
  async get(interviewPostId: string, accessToken?: string | null) {
    const path = interviewPostRoutes.detail(interviewPostId);

    try {
      return await apiGet<InterviewPost>(path, accessToken);
    } catch (error) {
      if (accessToken && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return apiGet<InterviewPost>(path);
      }

      throw error;
    }
  },
  create(input: CreateInterviewPostInput, accessToken?: string | null) {
    return apiRequest<InterviewPost>(interviewPostRoutes.collection, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  close(interviewPostId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(interviewPostRoutes.status(interviewPostId), {
      method: "PATCH",
      accessToken,
      body: JSON.stringify({ status: "closed" }),
    });
  },
  archive(interviewPostId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(interviewPostRoutes.archive(interviewPostId), {
      method: "POST",
      accessToken,
    });
  },
  reopen(interviewPostId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(interviewPostRoutes.reopen(interviewPostId), {
      method: "POST",
      accessToken,
    });
  },
} as const;
