import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  interviewPostsApi,
  type ListInterviewPostsParams,
} from "../../shared/api/interviewPosts";

export const interviewPostQueryKeys = {
  all: ["interview-posts"] as const,
  list(params?: ListInterviewPostsParams) {
    return ["interview-posts", params ?? null, "api"] as const;
  },
} as const;

export function useInterviewPosts(params?: ListInterviewPostsParams) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => interviewPostsApi.list(params, { signal }),
    queryKey: interviewPostQueryKeys.list(params),
    staleTime: 30_000,
  });
}
