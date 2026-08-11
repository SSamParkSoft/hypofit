import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { interviewPostsApi } from "../../shared/api/interviewPosts";
import type { CreateInterviewPostInput } from "../../shared/api/types";
import { AuthContext } from "../auth/AuthProvider";
import { interviewPostQueryKeys } from "./useInterviewPosts";

export function useCreateInterviewPost(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (input: CreateInterviewPostInput) =>
      interviewPostsApi.create(input, effectiveAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: interviewPostQueryKeys.all });
    },
  });
}
