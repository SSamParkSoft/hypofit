import { useMemo } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { formatUserDisplayName } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useUpdateApplicationStatus } from "@/features/applications/useApplicationMutations";
import { useChatRooms } from "@/features/chat/useChat";
import { usePostings } from "@/features/postings/usePostings";
import { formatAnswerLabel } from "@/features/applications/applicationReadModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/shared/ui/StateMessage";
import { resolveReturnTo } from "@/shared/navigation/backNavigation";
import { ApplicantAvatar, ActivityHeader, StatusTag } from "./ActivityComponents";
import { canOpenApplicantChat, getApplicantManagementStatus } from "./activityStatus";

export function ApplicantDetailScreen() {
  const params = useLocalSearchParams<{
    applicationId?: string;
    postId?: string;
    returnTo?: string | string[];
  }>();
  const applicationId = Array.isArray(params.applicationId) ? params.applicationId[0] : params.applicationId;
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const backTo = resolveReturnTo(
    params.returnTo,
    postId ? `/(tabs)/interviews/my-posts/${postId}` : "/(tabs)/interviews/my-interviews",
  );
  const { accessToken, appUser } = useAuth();
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = usePostings(undefined, accessToken);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: chatRooms = [], isError: isChatRoomsError, isLoading: isChatRoomsLoading } = useChatRooms(accessToken);
  const updateApplicationStatus = useUpdateApplicationStatus(accessToken);

  const post = useMemo(
    () => posts.find((item) => item.id === postId) ?? null,
    [postId, posts],
  );
  const application = useMemo(
    () => applications.find((item) => item.id === applicationId) ?? null,
    [applicationId, applications],
  );
  const chatRoom = useMemo(
    () => chatRooms.find((room) => room.application_id === applicationId) ?? null,
    [applicationId, chatRooms],
  );
  const isLoading = isPostsLoading || isApplicationsLoading || isChatRoomsLoading;
  const isError = isPostsError || isApplicationsError || isChatRoomsError;
  const canAccessApplication = Boolean(
    appUser
      && post
      && application
      && post.founder_id === appUser.id
      && application.interview_post_id === post.id,
  );

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <ActivityHeader backTo={backTo} title="지원자 정보" />
          <StateMessage title="로그인이 필요해요." description="지원자 정보는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <ActivityHeader backTo={backTo} title="지원 정보" />

        {isLoading ? <StateMessage title="지원자 정보를 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage
            title="지원자 정보를 불러오지 못했습니다."
            description="API 연결 상태를 확인한 뒤 다시 시도하세요."
          />
        ) : null}
        {!isLoading && !isError && (!post || !application) ? (
          <StateMessage title="신청자 정보를 찾을 수 없어요." description="공고나 신청 정보가 삭제되었을 수 있어요." />
        ) : null}
        {!isLoading && !isError && post && application && !canAccessApplication ? (
          <StateMessage title="관리 권한이 없어요." description="내가 만든 공고의 신청자 정보만 볼 수 있어요." />
        ) : null}

        {!isLoading && !isError && post && application && canAccessApplication ? (
          <ScrollView contentContainerClassName="pb-24" showsVerticalScrollIndicator={false}>
            <ApplicantIdentityHeader application={application} post={post} />
            <ApplicantSubmittedContent application={application} />
            <ApplicantManagementActions
              application={application}
              chatRoomId={chatRoom?.id ?? null}
              isSubmitting={updateApplicationStatus.isPending}
              onOpenChat={() => {
                if (!chatRoom) return;
                router.push({
                  pathname: "/(tabs)/chat/[roomId]",
                  params: {
                    roomId: chatRoom.id,
                    returnTo: `/(tabs)/interviews/my-posts/${post.id}/applicants/${application.id}`,
                  },
                });
              }}
              onReject={() => {
                Alert.alert("이 지원을 반려할까요?", "반려한 지원자는 다시 선정할 수 없어요.", [
                  { style: "cancel", text: "취소" },
                  {
                    style: "destructive",
                    text: "반려하기",
                    onPress: () => {
                      updateApplicationStatus.mutate(
                        { applicationId: application.id, input: { status: "rejected" } },
                        {
                          onError: () => {
                            Alert.alert("처리하지 못했어요.", "잠시 후 다시 시도해 주세요.");
                          },
                        },
                      );
                    },
                  },
                ]);
              }}
              onSelect={() => {
                Alert.alert("이 지원자를 선정할까요?", "선정 후 채팅에서 일정과 진행 방법을 조율할 수 있어요.", [
                  { style: "cancel", text: "취소" },
                  {
                    text: "선정하기",
                    onPress: () => {
                      updateApplicationStatus.mutate(
                        { applicationId: application.id, input: { status: "selected" } },
                        {
                          onError: () => {
                            Alert.alert("처리하지 못했어요.", "잠시 후 다시 시도해 주세요.");
                          },
                          onSuccess: () => {
                            Alert.alert("선정했어요.", "채팅에서 일정과 진행 방법을 조율해 주세요.");
                          },
                        },
                      );
                    },
                  },
                ]);
              }}
            />
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ApplicantManagementActions({
  application,
  chatRoomId,
  isSubmitting,
  onOpenChat,
  onReject,
  onSelect,
}: {
  application: Application;
  chatRoomId: string | null;
  isSubmitting: boolean;
  onOpenChat: () => void;
  onReject: () => void;
  onSelect: () => void;
}) {
  const isAwaitingReview = application.status === "applied";
  const canOpenChat = Boolean(chatRoomId && canOpenApplicantChat(application.status));

  return (
    <View className="mt-7 border-t border-hypo-border pt-5">
      {isAwaitingReview ? (
        <>
          <Text className="text-[16px] font-bold text-hypo-text">지원자 관리</Text>
          <Text className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">
            선정하면 이 지원자와 일정 조율을 시작할 수 있어요.
          </Text>
          <View className="mt-4 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              className="min-h-[52px] flex-1 items-center justify-center rounded-[12px] border border-hypo-border bg-hypo-bg px-3"
              style={{ opacity: isSubmitting ? 0.5 : 1 }}
              onPress={onReject}
            >
              <Text className="text-[14px] font-semibold text-hypo-danger">반려하기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              className="min-h-[52px] flex-1 items-center justify-center rounded-[12px] bg-hypo-brand px-3"
              style={{ opacity: isSubmitting ? 0.5 : 1 }}
              onPress={onSelect}
            >
              <Text className="text-[14px] font-semibold text-white">{isSubmitting ? "처리 중" : "선정하기"}</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {canOpenChat ? (
        <Pressable
          accessibilityRole="button"
          className={`${isAwaitingReview ? "mt-2" : ""} min-h-[52px] items-center justify-center rounded-[12px] bg-hypo-brand px-3`}
          onPress={onOpenChat}
        >
          <Text className="text-[14px] font-semibold text-white">채팅 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ApplicantIdentityHeader({ application, post }: { application: Application; post: InterviewPost }) {
  const participantLabel = formatUserDisplayName(application.respondent);
  const status = getApplicantManagementStatus(application.status);

  return (
    <View className="mt-5 border-b border-hypo-border pb-5">
      <View className="flex-row items-center gap-3">
        <ApplicantAvatar application={application} size="large" />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-[20px] font-bold leading-7 text-hypo-text">
              {participantLabel}
            </Text>
            <StatusTag {...status} />
          </View>
          {application.respondent?.organization_name ? (
            <Text numberOfLines={1} className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">
              {application.respondent.organization_name}
            </Text>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} className="mt-4 text-[13px] leading-5 text-hypo-text-metadata">
        {post.title}
      </Text>
    </View>
  );
}

function ApplicantSubmittedContent({ application }: { application: Application }) {
  const answers = Object.entries(application.answers).filter(([, value]) => value.trim().length > 0);

  return (
    <View className="mt-5">
      {answers.length ? (
        <View className="gap-4">
          {answers.map(([key, value]) => (
            <View key={key} className="gap-1.5">
              <Text className="text-[13px] font-semibold text-hypo-text-secondary">{formatAnswerLabel(key)}</Text>
              <Text className="text-[16px] font-medium leading-[25px] text-hypo-text">{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-3 text-[13px] font-bold leading-5 text-hypo-muted">
          작성된 답변이 없어요.
        </Text>
      )}

      <View className="mt-5 gap-2">
        <Text className="text-[13px] font-semibold text-hypo-text-secondary">가능 시간</Text>
        {application.available_times.length ? (
          <View className="flex-row flex-wrap gap-2">
            {application.available_times.map((time) => (
              <View key={time} className="rounded-full border border-hypo-border bg-hypo-surface px-3 py-1.5">
                <Text className="text-xs font-semibold text-hypo-text-secondary">{time}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-[13px] font-bold leading-5 text-hypo-muted">가능 시간이 아직 없어요.</Text>
        )}
      </View>
    </View>
  );
}
