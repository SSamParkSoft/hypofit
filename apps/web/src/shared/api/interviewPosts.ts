import { apiRequest, type ApiRequestInit } from "./client";
import { withInterviewPostFeatures } from "./interviewPostFeatures";
import type {
  CreateInterviewPostInput,
  InterviewMode,
  InterviewPost,
  InterviewPostStatus,
} from "./types";

export interface ListInterviewPostsParams {
  status?: InterviewPostStatus;
  mode?: InterviewMode;
  founderId?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
  sort?: "newest" | "distance" | "reward";
  limit?: number;
}

const interviewPostsCollectionPath = "/api/v1/interview-posts/";

function buildInterviewPostsPath(params?: ListInterviewPostsParams): string {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  if (params?.mode) {
    searchParams.set("mode", params.mode);
  }

  if (params?.founderId) {
    searchParams.set("founder_id", params.founderId);
  }

  if (params?.lat !== undefined) {
    searchParams.set("lat", String(params.lat));
  }

  if (params?.lng !== undefined) {
    searchParams.set("lng", String(params.lng));
  }

  if (params?.radiusM !== undefined) {
    searchParams.set("radius_m", String(params.radiusM));
  }

  if (params?.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();

  return queryString
    ? `${interviewPostsCollectionPath}?${queryString}`
    : interviewPostsCollectionPath;
}

export const interviewPostRoutes = {
  collection: interviewPostsCollectionPath,
  detail: (interviewPostId: string) =>
    `${interviewPostsCollectionPath}${encodeURIComponent(interviewPostId)}`,
} as const;

export function listInterviewPosts(
  params?: ListInterviewPostsParams,
  init?: ApiRequestInit,
): Promise<InterviewPost[]> {
  return apiRequest<InterviewPost[]>(
    buildInterviewPostsPath(params),
    withInterviewPostFeatures(init),
  );
}

export function getInterviewPost(
  interviewPostId: string,
  init?: ApiRequestInit,
): Promise<InterviewPost> {
  return apiRequest<InterviewPost>(
    interviewPostRoutes.detail(interviewPostId),
    withInterviewPostFeatures(init),
  );
}

export function createInterviewPost(
  input: CreateInterviewPostInput,
  accessToken?: string | null,
): Promise<InterviewPost> {
  return apiRequest<InterviewPost>(interviewPostRoutes.collection, {
    ...withInterviewPostFeatures(),
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const interviewPostsApi = {
  list: listInterviewPosts,
  get: getInterviewPost,
  create: createInterviewPost,
} as const;
