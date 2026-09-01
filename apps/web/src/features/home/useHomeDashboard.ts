import { useMemo } from "react";

import { useApplications } from "../applications/useApplications";
import { useChatRooms } from "../chat/useChatRooms";
import { useInterviewPosts } from "../interview-posts/useInterviewPosts";
import { useSessions } from "../sessions/useSessions";
import { buildHomeDashboardData } from "./model/homeDashboardModel";

export function useHomeDashboard({
  accessToken,
  appUserId,
}: {
  accessToken: string | null;
  appUserId: string | null;
}) {
  const postsQuery = useInterviewPosts({ limit: 8, sort: "newest", status: "open" });
  const applicationsQuery = useApplications(accessToken);
  const sessionsQuery = useSessions(accessToken);
  const chatRoomsQuery = useChatRooms(accessToken);

  const data = useMemo(
    () =>
      buildHomeDashboardData({
        applications: applicationsQuery.data ?? [],
        appUserId,
        chatRooms: chatRoomsQuery.data ?? [],
        posts: postsQuery.data ?? [],
        sessions: sessionsQuery.data ?? [],
      }),
    [
      applicationsQuery.data,
      appUserId,
      chatRoomsQuery.data,
      postsQuery.data,
      sessionsQuery.data,
    ],
  );

  return {
    data,
    hasError:
      postsQuery.isError ||
      applicationsQuery.isError ||
      sessionsQuery.isError ||
      chatRoomsQuery.isError,
    isLoading:
      postsQuery.isLoading ||
      applicationsQuery.isLoading ||
      sessionsQuery.isLoading ||
      chatRoomsQuery.isLoading,
    refetch: () =>
      Promise.all([
        postsQuery.refetch(),
        applicationsQuery.refetch(),
        sessionsQuery.refetch(),
        chatRoomsQuery.refetch(),
      ]),
  };
}
