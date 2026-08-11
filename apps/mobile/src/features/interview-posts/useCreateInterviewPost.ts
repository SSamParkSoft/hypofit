import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInterviewPostInput } from "@hypofit/contracts";
import { interviewPostsApi } from "@/shared/api/interviewPosts";

export function useCreateInterviewPost(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInterviewPostInput) => interviewPostsApi.create(input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interview-posts"] });
    },
  });
}
