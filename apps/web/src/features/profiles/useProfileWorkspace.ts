import { useState } from "react";

import { useApplications } from "../applications/useApplications";
import { useAuth } from "../auth/useAuth";
import { useChatRooms } from "../chat/useChatRooms";
import { useInterviewPosts } from "../interview-posts/useInterviewPosts";
import { useSessions } from "../sessions/useSessions";
import type { AppUser } from "../../shared/api/types";
import { getApiErrorMessage } from "../../shared/api/errorPresentation";
import { uploadProfileImage } from "../../shared/supabase/profileImages";

export function useProfileWorkspace(appUser: AppUser | null) {
  const { accessToken, errorMessage, isSyncing, syncCurrentUser, user } =
    useAuth();
  const { data: applications = [], isLoading: isApplicationsLoading } =
    useApplications(accessToken);
  const { data: interviewPosts = [], isLoading: isInterviewPostsLoading } =
    useInterviewPosts(appUser ? { founderId: appUser.id } : undefined);
  const { data: sessions = [], isLoading: isSessionsLoading } =
    useSessions(accessToken);
  const { data: chatRooms = [], isLoading: isChatRoomsLoading } =
    useChatRooms(accessToken);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const isActivityLoading =
    isApplicationsLoading ||
    isInterviewPostsLoading ||
    isSessionsLoading ||
    isChatRoomsLoading;
  const activeSessionCount = sessions.filter(
    (session) => session.status === "scheduled",
  ).length;
  const canCreatePosts = Boolean(appUser?.id ?? user?.id);
  const statusMessage = isUploadingImage
    ? "프로필 사진을 올리는 중이에요."
    : isSyncing
      ? "계정 정보를 저장하는 중이에요."
      : (errorMessage ?? localMessage);

  async function handleProfileImageSelected(file: File) {
    if (!user) {
      return;
    }

    setIsUploadingImage(true);
    setLocalMessage(null);

    try {
      const uploaded = await uploadProfileImage(user.id, file);
      await syncCurrentUser({
        name: appUser?.name ?? user.email?.split("@")[0] ?? "Hypofit user",
        bio: appUser?.bio ?? null,
        phone: appUser?.phone ?? null,
        role: appUser?.role ?? "both",
        profile_image_path: uploaded.path,
        profile_image_url: uploaded.publicUrl,
        organization_type: appUser?.organization_type ?? null,
        organization_name: appUser?.organization_name ?? null,
      });
      setLocalMessage("프로필 사진이 저장됐어요.");
    } catch (error) {
      setLocalMessage(
        getApiErrorMessage(error, "프로필 사진을 저장하지 못했어요."),
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  return {
    activeSessionCount,
    applications,
    canCreatePosts,
    chatRooms,
    errorMessage,
    handleProfileImageSelected,
    interviewPosts,
    isActivityLoading,
    isSyncing,
    isUploadingImage,
    statusMessage,
    user,
  };
}
