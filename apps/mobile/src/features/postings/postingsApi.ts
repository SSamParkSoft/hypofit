import type {
  CompensationType,
  CreateInterviewPostInput,
  InterviewPostCreationCapabilities,
  InterviewMode,
  InterviewPost,
  InterviewPostStatus,
  UpdateInterviewPostInput,
} from "@hypofit/contracts";
import { ApiError, apiRequest } from "@/shared/api/client";
import { withPostingFeatures } from "./postingFeatureHeaders";

// Released HTTP paths, DTO names and founder_id fields remain wire-compatible.
export interface PostingsListParams {
  status?: InterviewPostStatus;
  mode?: InterviewMode;
  founderId?: string;
  q?: string;
  compensationType?: CompensationType;
  rewardMin?: number;
  rewardMax?: number;
  lat?: number;
  lng?: number;
  radiusM?: number;
  sort?: "newest" | "distance" | "reward";
  limit?: number;
}

const postingsCollectionPath = "/api/v1/interview-posts/";

function buildPostingsPath(params?: PostingsListParams): string {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.set("status", params.status);
  if (params?.mode) searchParams.set("mode", params.mode);
  if (params?.founderId) searchParams.set("founder_id", params.founderId);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.compensationType) searchParams.set("compensation_type", params.compensationType);
  if (params?.rewardMin !== undefined) searchParams.set("reward_min", String(params.rewardMin));
  if (params?.rewardMax !== undefined) searchParams.set("reward_max", String(params.rewardMax));
  if (params?.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params?.lng !== undefined) searchParams.set("lng", String(params.lng));
  if (params?.radiusM !== undefined) searchParams.set("radius_m", String(params.radiusM));
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${postingsCollectionPath}?${queryString}` : postingsCollectionPath;
}

export const postingRoutes = {
  collection: postingsCollectionPath,
  detail: (postId: string) =>
    `${postingsCollectionPath}${encodeURIComponent(postId)}`,
  status: (postId: string) =>
    `${postingRoutes.detail(postId)}/status`,
  archive: (postId: string) =>
    `${postingRoutes.detail(postId)}/archive`,
  reopen: (postId: string) =>
    `${postingRoutes.detail(postId)}/reopen`,
  creationCapabilities: `${postingsCollectionPath}creation-capabilities`,
} as const;

export const postingsApi = {
  getCreationCapabilities(accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<InterviewPostCreationCapabilities>(
      postingRoutes.creationCapabilities,
      withPostingFeatures({ accessToken, signal }),
    );
  },
  list(params?: PostingsListParams, signal?: AbortSignal) {
    return apiRequest<InterviewPost[]>(
      buildPostingsPath(params),
      withPostingFeatures({ signal }),
    );
  },
  listForUser(params?: PostingsListParams, accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<InterviewPost[]>(
      buildPostingsPath(params),
      withPostingFeatures({ accessToken, signal }),
    );
  },
  async get(postId: string, accessToken?: string | null, signal?: AbortSignal) {
    const path = postingRoutes.detail(postId);

    try {
      return await apiRequest<InterviewPost>(path, withPostingFeatures({ accessToken, signal }));
    } catch (error) {
      if (accessToken && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return apiRequest<InterviewPost>(path, withPostingFeatures({ signal }));
      }

      throw error;
    }
  },
  create(input: CreateInterviewPostInput, accessToken?: string | null) {
    return apiRequest<InterviewPost>(postingRoutes.collection, {
      ...withPostingFeatures(),
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  update(postId: string, input: UpdateInterviewPostInput, accessToken?: string | null) {
    return apiRequest<InterviewPost>(postingRoutes.detail(postId), {
      ...withPostingFeatures(),
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  close(postId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(postingRoutes.status(postId), {
      ...withPostingFeatures(),
      method: "PATCH",
      accessToken,
      body: JSON.stringify({ status: "closed" }),
    });
  },
  archive(postId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(postingRoutes.archive(postId), {
      ...withPostingFeatures(),
      method: "POST",
      accessToken,
    });
  },
  reopen(postId: string, accessToken?: string | null) {
    return apiRequest<InterviewPost>(postingRoutes.reopen(postId), {
      ...withPostingFeatures(),
      method: "POST",
      accessToken,
    });
  },
} as const;
