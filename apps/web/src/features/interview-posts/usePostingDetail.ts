import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { interviewPostsApi } from "../../shared/api/interviewPosts";
import { AuthContext } from "../auth/authContext";

export function usePostingDetail(postId?: string | null) {
  const auth = useContext(AuthContext);
  return useQuery({
    queryKey: ["posting-details", auth?.user?.id ?? "public", postId ?? null, "api"],
    queryFn: ({ signal }) => interviewPostsApi.get(postId!, { accessToken: auth?.accessToken, signal }),
    enabled: Boolean(postId),
    staleTime: 30_000,
  });
}
