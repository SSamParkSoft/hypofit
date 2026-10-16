import { useQuery } from "@tanstack/react-query";
import type { InterviewPostCreationCapabilities } from "@hypofit/contracts";
import { apiRequest } from "../../shared/api/client";

export function usePostingImageCapabilities(accessToken?: string | null) {
  return useQuery({
    queryKey: ["posting-creation-capabilities", "images"],
    queryFn: ({ signal }) => apiRequest<InterviewPostCreationCapabilities>("/api/v1/interview-posts/creation-capabilities", { signal }),
    enabled: Boolean(accessToken), staleTime: 30_000,
  });
}
