import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { formatUserDisplayName } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useChatRooms } from "@/features/chat/useChat";
import {
  usePostings,
  useUpdatePostingLifecycle,
  type PostingLifecycleAction,
} from "@/features/postings/usePostings";
import { SurveyOwnerParticipants } from "@/features/surveys/SurveyOwnerParticipants";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/shared/ui/StateMessage";
import {
  getPostingCompensationLabel,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/features/postings/postingPresentation";
import { goBackOrReplaceFallback, resolveReturnTo } from "@/shared/navigation/backNavigation";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";
import {
  canEditPostingContent,
  canDeletePosting,
  canOpenApplicantChat,
  getApplicantManagementStatus,
  getAvailablePostStatusActions,
  getPostStatusDisplay,
} from "./activityStatus";
import { ApplicantAvatar, ActivityHeader, StatusTag } from "./ActivityComponents";
import { colors } from "@/shared/theme/tokens";

type ApplicantManagementTab = "applicants" | "in_progress" | "completed";

export function PostingApplicantsScreen() {
  const params = useLocalSearchParams<{ postId?: string; returnTo?: string | string[] }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews/my-interviews");
  const { accessToken, appUser } = useAuth();
  const [activeApplicantTab, setActiveApplicantTab] = useState<ApplicantManagementTab>("applicants");
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = usePostings(undefined, accessToken);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: chatRooms = [], isError: isChatRoomsError, isLoading: isChatRoomsLoading } = useChatRooms(accessToken);
  const updatePostLifecycle = useUpdatePostingLifecycle(accessToken);

  const post = useMemo(
    () => posts.find((item) => item.id === postId) ?? null,
    [postId, posts],
  );
  const postApplications = useMemo(
    () => (post ? applications.filter((application) => application.interview_post_id === post.id) : []),
    [applications, post],
  );
  const chatRoomByApplicationId = useMemo(() => {
    const roomMap = new Map<string, string>();

    for (const room of chatRooms) {
      roomMap.set(room.application_id, room.id);
    }

    return roomMap;
  }, [chatRooms]);
  const isLoading = isPostsLoading || isApplicationsLoading || isChatRoomsLoading;
  const isError = isPostsError || isApplicationsError || isChatRoomsError;
  const canAccessPost = Boolean(appUser && post && post.founder_id === appUser.id);
  const canEditPost = Boolean(post && canEditPostingContent(post.status));
  const canDeletePost = Boolean(post && canDeletePosting(post.status));
  const managementReturnTo = postId
    ? `/(tabs)/interviews/my-posts/${postId}`
    : "/(tabs)/interviews/my-interviews";

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <ActivityHeader backTo={backTo} title="내 공고" />
          <StateMessage title="로그인이 필요해요." description="내가 만든 공고는 로그인 후 관리할 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <ActivityHeader
          backTo={backTo}
          title="지원자 관리"
          right={
            post && canAccessPost ? (
              <Pressable
                accessibilityLabel="공고 메뉴 열기"
                accessibilityRole="button"
                hitSlop={12}
                className="h-10 w-9 items-center justify-center"
                onPress={() => setIsPostMenuOpen((isOpen) => !isOpen)}
              >
                <Feather name="more-horizontal" size={22} color="#26312A" />
              </Pressable>
            ) : undefined
          }
        />

        {isPostMenuOpen && post && canAccessPost ? (
          <PostManagementMenu
            canDeletePost={canDeletePost}
            canEditPost={canEditPost}
            onClose={() => setIsPostMenuOpen(false)}
            onDeletePost={() => {
              setIsPostMenuOpen(false);
              if (!post) return;
              if (!canDeletePost) {
                Alert.alert("삭제할 수 없어요", "완료된 공고는 기록 보존을 위해 삭제할 수 없어요.");
                return;
              }
              Alert.alert(
                "공고를 삭제할까요?",
                "삭제하면 목록에서 보이지 않아요. 진행 중인 지원자와 채팅 기록은 보존됩니다.",
                [
                  { style: "cancel", text: "취소" },
                  {
                    style: "destructive",
                    text: "삭제",
                    onPress: () => {
                      updatePostLifecycle.mutate(
                        { action: "archive", postId: post.id },
                        {
                          onSuccess: () => goBackOrReplaceFallback("/(tabs)/interviews/my-interviews"),
                        },
                      );
                    },
                  },
                ],
              );
            }}
            onEditPost={() => {
              setIsPostMenuOpen(false);
              if (!canEditPost) {
                Alert.alert("수정할 수 없어요", "완료된 공고는 기록 보존을 위해 수정할 수 없어요.");
                return;
              }
              router.push({
                pathname: "/interviews/[postId]/edit",
                params: { postId: post.id, returnTo: managementReturnTo },
              });
            }}
            onOpenStatus={() => {
              setIsStatusModalOpen(true);
              setIsPostMenuOpen(false);
            }}
            onPreviewPost={() => {
              setIsPostMenuOpen(false);
              router.push({
                pathname: "/interviews/[postId]",
                params: {
                  postId: post.id,
                  returnTo: managementReturnTo,
                },
              });
            }}
          />
        ) : null}

        {isLoading ? <StateMessage title="공고를 불러오는 중이에요." loading /> : null}
        {isError ? (
          <StateMessage
            title="공고를 불러오지 못했어요."
            description="잠시 후 다시 시도해 주세요."
          />
        ) : null}
        {!isLoading && !isError && !post ? (
          <StateMessage title="공고를 찾을 수 없어요." description="삭제되었거나 더 이상 접근할 수 없는 공고일 수 있어요." />
        ) : null}
        {!isLoading && !isError && post && !canAccessPost ? (
          <StateMessage title="관리 권한이 없어요." description="내가 만든 공고만 신청자를 확인할 수 있어요." />
        ) : null}

        {!isLoading && !isError && post && canAccessPost ? (
          <ScrollView contentContainerClassName="pb-24" showsVerticalScrollIndicator={false}>
            <PostingManagementSummary
              applications={postApplications}
              post={post}
              onPreview={() =>
                router.push({
                  pathname: "/interviews/[postId]",
                  params: { postId: post.id, returnTo: managementReturnTo },
                })
              }
            />
            {!(post.recruitment_type === "survey" && post.entry_mode === "direct") && <PostingApplicantsList
              activeTab={activeApplicantTab}
              applications={postApplications}
              chatRoomByApplicationId={chatRoomByApplicationId}
              onTabChange={setActiveApplicantTab}
              returnTo={managementReturnTo}
            />}
            {post.recruitment_type === "survey" && <SurveyOwnerParticipants key={post.id} postId={post.id} />}
          </ScrollView>
        ) : null}
      </View>

      <PostStatusModal
        isSubmitting={updatePostLifecycle.isPending}
        post={post}
        visible={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={(action) => {
          if (!post) return;
          updatePostLifecycle.mutate(
            { action, postId: post.id },
            {
              onSuccess: () => setIsStatusModalOpen(false),
            },
          );
        }}
      />
    </SafeAreaView>
  );
}

function PostManagementMenu({
  canDeletePost,
  canEditPost,
  onClose,
  onDeletePost,
  onEditPost,
  onOpenStatus,
  onPreviewPost,
}: {
  canDeletePost: boolean;
  canEditPost: boolean;
  onClose: () => void;
  onDeletePost: () => void;
  onEditPost: () => void;
  onOpenStatus: () => void;
  onPreviewPost: () => void;
}) {
  return (
    <>
      <Pressable className="absolute inset-0 z-10" onPress={onClose} />
      <View className="absolute right-4 top-[54px] z-20 w-[178px] overflow-hidden rounded-[16px] border border-hypo-border bg-hypo-surface shadow-sm">
        <MenuAction icon="external-link" label="미리보기" onPress={onPreviewPost} />
        <MenuAction disabled={!canEditPost} icon="edit-3" label="수정하기" onPress={onEditPost} />
        <MenuAction icon="toggle-right" label="상태 변경" onPress={onOpenStatus} />
        <MenuAction disabled={!canDeletePost} icon="trash-2" label="삭제하기" tone="danger" onPress={onDeletePost} />
      </View>
    </>
  );
}

function MenuAction({
  disabled,
  icon,
  label,
  onPress,
  tone = "neutral",
}: {
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "danger" | "neutral";
}) {
  const iconColor = tone === "danger" ? colors.danger : "#59645D";
  const textClassName = tone === "danger" ? "text-[13px] font-semibold text-hypo-danger" : "text-[13px] font-semibold text-hypo-text";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className="min-h-[44px] flex-row items-center gap-3 px-3.5"
      style={{ opacity: disabled ? 0.42 : 1 }}
      onPress={onPress}
    >
      <Feather name={icon} size={16} color={iconColor} />
      <Text className={textClassName}>{label}</Text>
    </Pressable>
  );
}

function PostStatusModal({
  isSubmitting,
  onClose,
  onSubmit,
  post,
  visible,
}: {
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (action: PostingLifecycleAction) => void;
  post: InterviewPost | null;
  visible: boolean;
}) {
  const actions = post ? getAvailablePostStatusActions(post.status) : [];

  return (
    <Modal animationType="fade" transparent visible={visible && Boolean(post)} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/35 p-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="w-full overflow-hidden rounded-[18px] bg-hypo-surface">
          <View className="border-b border-hypo-border px-5 py-4">
            <Text className="text-[18px] font-black text-hypo-text">상태 변경</Text>
            <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">
              현재 서버에서 지원하는 상태만 변경할 수 있어요.
            </Text>
          </View>

          {actions.length ? (
            actions.map((action) => (
              <Pressable
                key={action.action}
                accessibilityRole="button"
                disabled={isSubmitting}
                className="min-h-[58px] flex-row items-center gap-3 border-b border-hypo-border px-5 py-3"
                style={{ opacity: isSubmitting ? 0.5 : 1 }}
                onPress={() => onSubmit(action.action)}
              >
                <View className={`size-9 items-center justify-center rounded-full ${action.tone === "brand" ? "bg-hypo-brandSoft" : "bg-hypo-bg"}`}>
                  <Feather name={action.icon} size={17} color={action.tone === "brand" ? colors.brand : "#59645D"} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-black text-hypo-text">{action.label}</Text>
                  <Text className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">{action.description}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text className="px-5 py-5 text-[13px] font-bold leading-5 text-hypo-muted">
              이 상태는 앱에서 직접 변경할 수 없어요.
            </Text>
          )}

          <Pressable accessibilityRole="button" className="min-h-[52px] items-center justify-center px-5" onPress={onClose}>
            <Text className="text-[14px] font-black text-hypo-muted">취소</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PostingManagementSummary({
  applications,
  onPreview,
  post,
}: {
  applications: Application[];
  onPreview: () => void;
  post: InterviewPost;
}) {
  return (
    <View className="mb-5 mt-3 border-b border-hypo-border pb-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={2} className="text-[17px] font-bold leading-6 text-hypo-text">{post.title}</Text>
          <Text numberOfLines={1} className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">
            {`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)} · ${getPostingCompensationLabel(post)}`}
          </Text>
        </View>
        <StatusTag {...getPostStatusDisplay(post.status)} />
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[13px] font-medium text-hypo-text-metadata">지원자 {applications.length}명</Text>
        <Pressable
          accessibilityLabel="공고 미리보기 열기"
          accessibilityRole="button"
          className="min-h-11 flex-row items-center gap-1.5 px-1"
          onPress={onPreview}
        >
          <Text className="text-[13px] font-semibold text-hypo-brand">공고 미리보기</Text>
          <Feather color={colors.brand} name="eye" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function PostingApplicantsList({
  activeTab,
  applications,
  chatRoomByApplicationId,
  onTabChange,
  returnTo,
}: {
  activeTab: ApplicantManagementTab;
  applications: Application[];
  chatRoomByApplicationId: Map<string, string>;
  onTabChange: (tab: ApplicantManagementTab) => void;
  returnTo: string;
}) {
  const applicants = applications.filter((application) => application.status === "applied");
  const rejected = applications.filter((application) => application.status === "rejected");
  const selected = applications.filter((application) => application.status === "selected");
  const completed = applications.filter((application) => ["completed", "no_show", "canceled"].includes(application.status));
  const applicationsByTab: Record<ApplicantManagementTab, Application[]> = {
    applicants: [...applicants, ...rejected],
    in_progress: selected,
    completed,
  };
  const activeApplications = applicationsByTab[activeTab];
  const emptyCopyByTab: Record<ApplicantManagementTab, { description?: string; title: string }> = {
    applicants: {
      title: "지원자가 없어요.",
      description: "새 지원자가 생기면 이곳에서 내용을 확인할 수 있어요.",
    },
    in_progress: {
      title: "진행 중인 참여자가 없어요.",
      description: "선정한 지원자는 이곳에서 채팅과 일정을 관리할 수 있어요.",
    },
    completed: {
      title: "완료된 참여자가 없어요.",
    },
  };

  return (
    <View>
      <View accessibilityRole="tablist" className="mb-5 flex-row gap-2">
        <ApplicantManagementTabButton
          count={applicants.length + rejected.length}
          isActive={activeTab === "applicants"}
          label="지원자 목록"
          onPress={() => onTabChange("applicants")}
        />
        <ApplicantManagementTabButton
          count={selected.length}
          isActive={activeTab === "in_progress"}
          label="진행 중"
          onPress={() => onTabChange("in_progress")}
        />
        <ApplicantManagementTabButton
          count={completed.length}
          isActive={activeTab === "completed"}
          label="완료"
          onPress={() => onTabChange("completed")}
        />
      </View>

      {activeApplications.length ? (
        <ListSection chrome="plain" surface="background">
          {activeApplications.map((application) => (
            <ApplicantChatRow
              key={application.id}
              application={application}
              roomId={chatRoomByApplicationId.get(application.id) ?? null}
              returnTo={returnTo}
            />
          ))}
        </ListSection>
      ) : (
        <StateMessage {...emptyCopyByTab[activeTab]} />
      )}
    </View>
  );
}

function ApplicantManagementTabButton({
  count,
  isActive,
  label,
  onPress,
}: {
  count: number;
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      className={`min-h-11 flex-1 flex-row items-center justify-center gap-1 rounded-[10px] px-1 ${
        isActive ? "bg-hypo-brand" : "bg-hypo-surface"
      }`}
      onPress={onPress}
    >
      <Text className={`text-[14px] font-semibold ${isActive ? "text-white" : "text-hypo-text-secondary"}`}>{label}</Text>
      <Text className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-hypo-text-metadata"}`}>{count}</Text>
    </Pressable>
  );
}

function ApplicantChatRow({
  application,
  returnTo,
  roomId,
}: {
  application: Application;
  returnTo: string;
  roomId: string | null;
}) {
  const participantLabel = formatUserDisplayName(application.respondent);
  const applicantDetailReturnTo = returnTo;
  const experience = application.answers.relevant_experience ?? application.answers.experience;
  const availableTimes = application.available_times.slice(0, 2).join(" · ");
  const canOpenChat = Boolean(roomId && canOpenApplicantChat(application.status));
  const shouldShowStatus = application.status !== "applied";

  return (
    <ListRow
      accessibilityHint="두 번 탭하여 지원 내용을 확인합니다"
      accessibilityLabel={`${participantLabel} 지원 정보`}
      appearance="flat"
      className="py-3.5"
      onPress={() =>
        router.push({
          pathname: "/(tabs)/interviews/my-posts/[postId]/applicants/[applicationId]",
          params: {
            applicationId: application.id,
            postId: application.interview_post_id,
            returnTo: applicantDetailReturnTo,
          },
        })
      }
    >
      <View className="flex-row items-center gap-3">
        <ApplicantAvatar application={application} size="small" />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-black leading-[22px] text-hypo-text">
              {participantLabel}
            </Text>
            {shouldShowStatus ? <StatusTag {...getApplicantManagementStatus(application.status)} /> : null}
          </View>
          {experience ? (
            <Text numberOfLines={1} className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">
              {experience}
            </Text>
          ) : null}
          <Text numberOfLines={1} className="mt-1 text-[12px] leading-[18px] text-hypo-text-metadata">
            {availableTimes ? `가능 시간 · ${availableTimes}` : "가능 시간을 입력하지 않았어요"}
          </Text>
        </View>
        <View className="h-11 w-5 items-center justify-center">
          <Feather color={colors.textMetadata} name="chevron-right" size={19} />
        </View>
      </View>

      {canOpenChat && roomId ? (
        <Pressable
          accessibilityLabel={`${participantLabel}님과 채팅 보기`}
          accessibilityRole="button"
          className="mt-2 min-h-11 self-end justify-center px-1"
          onPress={(event) => {
            event.stopPropagation();
            router.push({ pathname: "/(tabs)/chat/[roomId]", params: { roomId, returnTo } });
          }}
        >
          <Text className="text-[13px] font-semibold text-hypo-brand">채팅 보기</Text>
        </Pressable>
      ) : null}
    </ListRow>
  );
}
