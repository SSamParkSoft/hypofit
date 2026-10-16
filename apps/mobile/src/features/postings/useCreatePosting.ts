import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateInterviewPostInput } from "@hypofit/contracts";
import { postingsApi } from "@/features/postings/postingsApi";

export function useCreatePosting(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInterviewPostInput) => postingsApi.create(input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interview-posts"] });
    },
  });
}
