import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import {
  canUseFounderTools,
  formatRecruitCount,
  formatReward,
  formatUserDisplayName,
  interviewModeLabels,
} from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useChatRooms } from "@/features/chat/useChat";
import {
  useInterviewPosts,
  useUpdateInterviewPostLifecycle,
  type InterviewPostLifecycleAction,
} from "@/features/interview-posts/useInterviewPosts";
import { useSessions } from "@/features/sessions/useSessions";
import {
  buildApplicationReadModels,
  formatAnswerLabel,
  type ApplicationReadModel,
} from "@/features/workflow/readModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/screens/home/HomeScreen";
import { goBackOrReplaceFallback, resolveReturnTo } from "@/shared/navigation/backNavigation";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";

type MyInterviewTab = "applications" | "posts";
type FounderPostManagementTab = "applicants" | "post";

export function MyInterviewsScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews");
  const { accessToken, appUser } = useAuth();
  const [activeTab, setActiveTab] = useState<MyInterviewTab>("applications");
  const canManageFounderPosts = canUseFounderTools(appUser?.role);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = useInterviewPosts(undefined, accessToken);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions(accessToken);

  const myApplications = useMemo(
    () => (appUser ? applications.filter((application) => application.respondent_id === appUser.id) : []),
    [appUser, applications],
  );
  const myApplicationRows = useMemo(
    () => buildApplicationReadModels({ applications: myApplications, posts, sessions }),
    [myApplications, posts, sessions],
  );
  const myFounderPosts = useMemo(
    () =>
      appUser && canManageFounderPosts ? posts.filter((post) => post.founder_id === appUser.id) : [],
    [appUser, canManageFounderPosts, posts],
  );
  const applicationsByPostId = useMemo(() => {
    const grouped = new Map<string, Application[]>();

    for (const application of applications) {
      grouped.set(application.interview_post_id, [
        ...(grouped.get(application.interview_post_id) ?? []),
        application,
      ]);
    }

    return grouped;
  }, [applications]);

  const isLoading = isPostsLoading || isApplicationsLoading || isSessionsLoading;
  const isError = isPostsError || isApplicationsError;

  useEffect(() => {
    if (!canManageFounderPosts && activeTab === "posts") {
      setActiveTab("applications");
    }
  }, [activeTab, canManageFounderPosts]);

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} />
          <StateMessage title="로그인이 필요해요." description="신청한 인터뷰와 모집글 진행 상태는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header backTo={backTo} />

        {canManageFounderPosts ? (
          <View className="mb-3 mt-2 flex-row rounded-full bg-hypo-surface p-1">
            <SegmentButton
              count={myApplicationRows.length}
              isActive={activeTab === "applications"}
              label="신청한 인터뷰"
              onPress={() => setActiveTab("applications")}
            />
            <SegmentButton
              count={myFounderPosts.length}
              isActive={activeTab === "posts"}
              label="내 모집글"
              onPress={() => setActiveTab("posts")}
            />
          </View>
        ) : null}

        {isLoading ? <StateMessage title="내 인터뷰를 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage
            title="내 인터뷰를 불러오지 못했습니다."
            description="API 연결 상태를 확인한 뒤 다시 시도하세요."
          />
        ) : null}

        {!isLoading && !isError ? (
          <ScrollView contentContainerClassName="pb-[30px]" showsVerticalScrollIndicator={false}>
            {activeTab === "applications" ? (
              myApplicationRows.length ? (
                <ListSection chrome="plain" surface="background">
                  {myApplicationRows.map((model) => (
                    <ApplicationRow
                      key={model.application.id}
                      model={model}
                      onPress={() =>
                        router.push({
                          pathname: "/interviews/[postId]",
                          params: {
                            postId: model.application.interview_post_id,
                            returnTo: "/(tabs)/interviews/my-interviews",
                          },
                        })
                      }
                    />
                  ))}
                </ListSection>
              ) : (
                <View className="gap-3">
                  <StateMessage title="아직 신청한 인터뷰가 없어요." description="조건에 맞는 모집글을 찾고 신청하면 이곳에서 진행 상태를 볼 수 있어요." />
                  {!canManageFounderPosts ? <FounderRoleHint /> : null}
                </View>
              )
            ) : null}

            {activeTab === "posts" && canManageFounderPosts ? (
              myFounderPosts.length ? (
                <ListSection chrome="plain" surface="background">
                  {myFounderPosts.map((post) => (
                    <FounderPostRow
                      key={post.id}
                      applications={applicationsByPostId.get(post.id) ?? []}
                      post={post}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/interviews/my-posts/[postId]",
                          params: {
                            postId: post.id,
                            returnTo: "/(tabs)/interviews/my-interviews",
                          },
                        })
                      }
                    />
                  ))}
                </ListSection>
              ) : (
                <StateMessage title="아직 만든 모집글이 없어요." description="인터뷰 화면에서 모집글을 만들면 지원자와 진행 상태를 이곳에서 관리할 수 있어요." />
              )
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function FounderPostApplicantsScreen() {
  const params = useLocalSearchParams<{ postId?: string; returnTo?: string | string[] }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews/my-interviews");
  const { accessToken, appUser } = useAuth();
  const [activeManagementTab, setActiveManagementTab] = useState<FounderPostManagementTab>("applicants");
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const canManageFounderPosts = canUseFounderTools(appUser?.role);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = useInterviewPosts(undefined, accessToken);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: chatRooms = [], isError: isChatRoomsError, isLoading: isChatRoomsLoading } = useChatRooms(accessToken);
  const updatePostLifecycle = useUpdateInterviewPostLifecycle(accessToken);

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
  const canAccessPost = Boolean(appUser && post && canManageFounderPosts && post.founder_id === appUser.id);
  const canEditPost = Boolean(post && canFounderChangePostContent(post.status));
  const canDeletePost = Boolean(post && canFounderDeletePost(post.status));
  const managementReturnTo = postId
    ? `/(tabs)/interviews/my-posts/${postId}`
    : "/(tabs)/interviews/my-interviews";

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} title="내 모집글" />
          <StateMessage title="로그인이 필요해요." description="내가 만든 모집글은 로그인 후 관리할 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header
          backTo={backTo}
          title={post?.title ?? "내 모집글"}
          right={
            post && canAccessPost ? (
              <View className="flex-row items-center gap-2">
                <StatusTag {...getPostStatusDisplay(post.status)} />
                <Pressable
                  accessibilityLabel="모집글 메뉴 열기"
                  accessibilityRole="button"
                  hitSlop={12}
                  className="h-10 w-9 items-center justify-center"
                  onPress={() => setIsPostMenuOpen((isOpen) => !isOpen)}
                >
                  <Feather name="more-horizontal" size={22} color="#26312A" />
                </Pressable>
              </View>
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
                Alert.alert("삭제할 수 없어요", "완료된 모집글은 기록 보존을 위해 삭제할 수 없어요.");
                return;
              }
              Alert.alert(
                "모집글을 삭제할까요?",
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
                Alert.alert("수정할 수 없어요", "완료된 모집글은 기록 보존을 위해 수정할 수 없어요.");
                return;
              }
              Alert.alert("수정 기능을 준비 중이에요", "모집글 수정 화면을 연결할 예정이에요.");
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

        {isLoading ? <StateMessage title="모집글을 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage
            title="모집글을 불러오지 못했습니다."
            description="API 연결 상태를 확인한 뒤 다시 시도하세요."
          />
        ) : null}
        {!isLoading && !isError && !post ? (
          <StateMessage title="모집글을 찾을 수 없어요." description="삭제되었거나 더 이상 접근할 수 없는 모집글일 수 있어요." />
        ) : null}
        {!isLoading && !isError && post && !canAccessPost ? (
          <StateMessage title="관리 권한이 없어요." description="내가 만든 모집글만 지원자를 관리할 수 있어요." />
        ) : null}

        {!isLoading && !isError && post && canAccessPost ? (
          <ScrollView contentContainerClassName="pb-[30px]" showsVerticalScrollIndicator={false}>
            <View className="mb-3 mt-2 flex-row rounded-full bg-hypo-surface p-1">
              <ManagementTabButton
                isActive={activeManagementTab === "applicants"}
                label="지원자 목록"
                onPress={() => setActiveManagementTab("applicants")}
              />
              <ManagementTabButton
                isActive={activeManagementTab === "post"}
                label="모집글 정보"
                onPress={() => setActiveManagementTab("post")}
              />
            </View>

            {activeManagementTab === "applicants" ? (
              <FounderPostApplicantsView
                applications={postApplications}
                chatRoomByApplicationId={chatRoomByApplicationId}
                returnTo={managementReturnTo}
              />
            ) : (
              <FounderPostInfoView
                post={post}
              />
            )}
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

function Header({
  backTo = "/(tabs)/interviews",
  right,
  title = "내 인터뷰",
}: {
  backTo?: Href;
  right?: ReactNode;
  title?: string;
}) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-10 w-10 items-center justify-center"
        onPress={() => goBackOrReplaceFallback(backTo)}
      >
        <Text className="text-[34px] font-semibold leading-9 text-hypo-text">‹</Text>
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-lg font-black text-hypo-text">{title}</Text>
      {right ?? <View className="w-10" />}
    </View>
  );
}

function SegmentButton({
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
      accessibilityState={{ selected: isActive }}
      accessibilityRole="button"
      className={`min-h-11 flex-1 flex-row items-center justify-center gap-[7px] rounded-full px-3 ${
        isActive ? "bg-hypo-brand" : "bg-transparent"
      }`}
      onPress={onPress}
    >
      <Text className={`text-[13px] font-black ${isActive ? "text-white" : "text-hypo-muted"}`}>{label}</Text>
      <View className={`min-w-[22px] items-center rounded-full px-[7px] py-[3px] ${isActive ? "bg-white/20" : "bg-hypo-bg"}`}>
        <Text className={`text-[11px] font-black ${isActive ? "text-white" : "text-hypo-muted"}`}>{count}</Text>
      </View>
    </Pressable>
  );
}

function ManagementTabButton({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityState={{ selected: isActive }}
      accessibilityRole="button"
      className={`min-h-11 flex-1 flex-row items-center justify-center gap-[7px] rounded-full px-3 ${
        isActive ? "bg-hypo-brand" : "bg-transparent"
      }`}
      onPress={onPress}
    >
      <Text className={`text-[13px] font-black ${isActive ? "text-white" : "text-hypo-muted"}`}>{label}</Text>
    </Pressable>
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
  const iconColor = tone === "danger" ? "#B91C1C" : "#59645D";
  const textClassName = tone === "danger" ? "text-[13px] font-black text-hypo-danger" : "text-[13px] font-black text-hypo-text";

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

function ApplicationRow({ model, onPress }: { model: ApplicationReadModel; onPress: () => void }) {
  const displayStatus = getApplicationDisplayStatus(model.application.status, model.session?.status);

  return (
    <ListRow appearance="flat" className="py-4" onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-black leading-[22px] text-hypo-text">
            {model.displayTitle}
          </Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {model.post ? (
              <>
                <Text className="text-xs font-black text-[#087C43]">{formatReward(model.post.reward_amount)}</Text>
                <Text className="text-xs font-extrabold text-hypo-muted">{interviewModeLabels[model.post.interview_mode]}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View className="items-end gap-[6px]">
          <StatusTag label={displayStatus.label} tone={displayStatus.tone} />
          <Text className="text-[23px] font-light leading-7 text-hypo-muted">›</Text>
        </View>
      </View>
    </ListRow>
  );
}

function FounderRoleHint() {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[58px] flex-row items-center gap-3 border-t border-hypo-border py-3"
      onPress={() => router.push("/(tabs)/profile/role")}
    >
      <View className="size-9 items-center justify-center rounded-full bg-hypo-brandSoft">
        <Text className="text-[15px] font-black text-hypo-brand">+</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-black text-hypo-text">모집글도 만들 수 있어요</Text>
        <Text className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">
          역할 설정에서 창업자 기능을 켜면 모집 관리를 사용할 수 있어요.
        </Text>
      </View>
      <Text className="text-[23px] font-light leading-7 text-hypo-muted">›</Text>
    </Pressable>
  );
}

function FounderPostRow({
  applications,
  onPress,
  post,
}: {
  applications: Application[];
  onPress: () => void;
  post: InterviewPost;
}) {
  const selectedCount = applications.filter((application) => application.status === "selected").length;
  const postStatus = getPostStatusDisplay(post.status);

  return (
    <ListRow appearance="flat" className="py-4" onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-black leading-[22px] text-hypo-text">{post.title}</Text>
          <Text numberOfLines={1} className="mt-1 text-xs font-extrabold leading-[18px] text-hypo-muted">
            지원 {applications.length}명 · 선정 {selectedCount}명
          </Text>
        </View>
        <View className="items-end gap-[6px]">
          <StatusTag label={postStatus.label} tone={postStatus.tone} />
          <Text className="text-[23px] font-light leading-7 text-hypo-muted">›</Text>
        </View>
      </View>
    </ListRow>
  );
}

function FounderPostInfoView({
  post,
}: {
  post: InterviewPost;
}) {
  return (
    <View>
      <View>
        <InfoRow label="서비스" value={post.service_summary} />
        <InfoRow label="찾는 사람" value={post.target_description} />
        <InfoRow label="방식" value={interviewModeLabels[post.interview_mode]} />
        <InfoRow label="모집 인원" value={formatRecruitCount(post.recruit_count)} />
        <InfoRow label="사례비" value={formatReward(post.reward_amount)} />
        <InfoRow label="소요 시간" value={`${post.duration_minutes}분`} />
        <InfoRow label="가능 일정" value={formatScheduleOptions(post.schedule_options)} />
        {post.interview_mode !== "online" ? (
          <InfoRow label="장소" value={formatPostLocation(post)} />
        ) : null}
      </View>

    </View>
  );
}

function canFounderChangePostContent(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
}

function canFounderDeletePost(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[54px] flex-row gap-4 border-b border-hypo-border py-3.5">
      <Text className="w-[74px] text-[13px] font-extrabold leading-[20px] text-hypo-muted">{label}</Text>
      <Text className="min-w-0 flex-1 text-[14px] font-black leading-[21px] text-hypo-text">{value}</Text>
    </View>
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
  onSubmit: (action: InterviewPostLifecycleAction) => void;
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
                  <Feather name={action.icon} size={17} color={action.tone === "brand" ? "#087C43" : "#59645D"} />
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

function FounderPostApplicantsView({
  applications,
  chatRoomByApplicationId,
  returnTo,
}: {
  applications: Application[];
  chatRoomByApplicationId: Map<string, string>;
  returnTo: string;
}) {
  return (
    <View>
      {applications.length ? (
        <ListSection chrome="plain" surface="background">
          {applications.map((application) => (
            <ApplicantChatRow
              key={application.id}
              application={application}
              roomId={chatRoomByApplicationId.get(application.id) ?? null}
              returnTo={returnTo}
            />
          ))}
        </ListSection>
      ) : (
        <StateMessage title="아직 지원자가 없어요." description="지원자가 생기면 이곳에서 채팅으로 바로 이동할 수 있어요." />
      )}
    </View>
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
  const respondentLabel = formatUserDisplayName(application.respondent);
  const applicantDetailReturnTo = returnTo;

  return (
    <ListRow appearance="flat" className="py-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-hypo-brandSoft">
          <Feather name="user" size={18} color="#176B5D" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-black leading-[22px] text-hypo-text">
              {respondentLabel}
            </Text>
            <StatusPill status={application.status} />
          </View>
        </View>
      </View>

      <View className="mt-2 flex-row justify-end gap-2 pl-[52px]">
        <Pressable
          accessibilityRole="button"
          className="min-h-11 justify-center rounded-full bg-hypo-surface px-[15px]"
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
          <Text className="text-[13px] font-black text-hypo-text">지원 정보</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!roomId}
          className={`min-h-11 justify-center rounded-full px-[15px] ${roomId ? "bg-hypo-brand" : "bg-hypo-surface"}`}
          onPress={() => {
            if (!roomId) return;
            router.push({
              pathname: "/(tabs)/chat/[roomId]",
              params: {
                roomId,
                returnTo,
              },
            });
          }}
        >
          <Text className={`text-[13px] font-black ${roomId ? "text-white" : "text-hypo-muted"}`}>
            {roomId ? "채팅 보기" : "채팅 준비 중"}
          </Text>
        </Pressable>
      </View>
    </ListRow>
  );
}

export function FounderApplicantDetailScreen() {
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
  const canManageFounderPosts = canUseFounderTools(appUser?.role);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = useInterviewPosts(undefined, accessToken);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: chatRooms = [], isError: isChatRoomsError, isLoading: isChatRoomsLoading } = useChatRooms(accessToken);

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
      && canManageFounderPosts
      && post.founder_id === appUser.id
      && application.interview_post_id === post.id,
  );
  const respondentLabel = application
    ? formatUserDisplayName(application.respondent)
    : "지원자 정보";

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} title="지원자 정보" />
          <StateMessage title="로그인이 필요해요." description="지원자 정보는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header
          backTo={backTo}
          title="지원 정보"
          right={application ? <StatusPill status={application.status} /> : undefined}
        />

        {isLoading ? <StateMessage title="지원자 정보를 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage
            title="지원자 정보를 불러오지 못했습니다."
            description="API 연결 상태를 확인한 뒤 다시 시도하세요."
          />
        ) : null}
        {!isLoading && !isError && (!post || !application) ? (
          <StateMessage title="지원자 정보를 찾을 수 없어요." description="모집글이나 신청 정보가 삭제되었을 수 있어요." />
        ) : null}
        {!isLoading && !isError && post && application && !canAccessApplication ? (
          <StateMessage title="관리 권한이 없어요." description="내가 만든 모집글의 지원자 정보만 볼 수 있어요." />
        ) : null}

        {!isLoading && !isError && post && application && canAccessApplication ? (
          <ScrollView contentContainerClassName="pb-[30px]" showsVerticalScrollIndicator={false}>
            <ApplicantSubmittedContent application={application} />

            <View className="mt-4 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={!chatRoom}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-full ${
                  chatRoom ? "bg-hypo-brand" : "bg-hypo-surface"
                }`}
                style={{ opacity: chatRoom ? 1 : 0.5 }}
                onPress={() => {
                  if (!chatRoom) return;
                  router.push({
                    pathname: "/(tabs)/chat/[roomId]",
                    params: {
                      roomId: chatRoom.id,
                      returnTo: `/(tabs)/interviews/my-posts/${post.id}/applicants/${application.id}`,
                    },
                  });
                }}
              >
                <Text className={`text-[13px] font-black ${chatRoom ? "text-white" : "text-hypo-muted"}`}>
                  {chatRoom ? "채팅 보기" : "채팅 준비 중"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
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
              <Text className="text-xs font-black text-hypo-muted">{formatAnswerLabel(key)}</Text>
              <Text className="text-[14px] font-bold leading-[22px] text-hypo-text">{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-3 text-[13px] font-bold leading-5 text-hypo-muted">
          작성된 답변이 없어요.
        </Text>
      )}

      <View className="mt-5 gap-2">
        <Text className="text-xs font-black text-hypo-muted">가능 시간</Text>
        {application.available_times.length ? (
          <View className="flex-row flex-wrap gap-2">
            {application.available_times.map((time) => (
              <View key={time} className="rounded-full bg-hypo-surface px-3 py-1.5">
                <Text className="text-xs font-extrabold text-hypo-muted">{time}</Text>
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

function getApplicationDisplayStatus(
  applicationStatus: Application["status"],
  sessionStatus?: string,
): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  if (sessionStatus) {
    const sessionLabelByStatus: Record<string, string> = {
      canceled: "취소",
      completed: "완료",
      no_show: "불참",
      scheduled: "선정",
    };
    const sessionToneByStatus: Record<string, "neutral" | "brand" | "danger"> = {
      canceled: "neutral",
      completed: "neutral",
      no_show: "danger",
      scheduled: "brand",
    };

    return {
      label: sessionLabelByStatus[sessionStatus] ?? sessionStatus,
      tone: sessionToneByStatus[sessionStatus] ?? "neutral",
    };
  }

  const applicationLabelByStatus: Record<Application["status"], string> = {
    applied: "신청",
    canceled: "취소",
    completed: "완료",
    no_show: "불참",
    rejected: "반려",
    selected: "선정",
  };
  const applicationToneByStatus: Record<Application["status"], "neutral" | "brand" | "danger"> = {
    applied: "neutral",
    canceled: "neutral",
    completed: "neutral",
    no_show: "danger",
    rejected: "danger",
    selected: "brand",
  };

  return {
    label: applicationLabelByStatus[applicationStatus],
    tone: applicationToneByStatus[applicationStatus],
  };
}

function getPostStatusDisplay(status: InterviewPost["status"]): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  const labelByStatus: Record<InterviewPost["status"], string> = {
    archived: "보관됨",
    closed: "마감",
    completed: "완료",
    draft: "임시저장",
    hidden: "숨김",
    open: "모집 중",
    removed: "삭제됨",
  };
  const toneByStatus: Record<InterviewPost["status"], "neutral" | "brand" | "danger"> = {
    archived: "neutral",
    closed: "neutral",
    completed: "neutral",
    draft: "neutral",
    hidden: "danger",
    open: "brand",
    removed: "danger",
  };

  return {
    label: labelByStatus[status],
    tone: toneByStatus[status],
  };
}

function getAvailablePostStatusActions(status: InterviewPost["status"]): Array<{
  action: InterviewPostLifecycleAction;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tone: "brand" | "neutral";
}> {
  if (status === "open") {
    return [
      {
        action: "close",
        description: "새 지원을 멈추고 기존 지원자만 관리합니다.",
        icon: "pause-circle",
        label: "모집 마감하기",
        tone: "neutral",
      },
    ];
  }

  if (status === "closed") {
    return [
      {
        action: "reopen",
        description: "다시 지원자를 받을 수 있도록 모집을 엽니다.",
        icon: "play-circle",
        label: "모집 재개하기",
        tone: "brand",
      },
    ];
  }

  if (status === "archived") {
    return [
      {
        action: "reopen",
        description: "보관을 풀고 다시 지원자를 받을 수 있게 합니다.",
        icon: "play-circle",
        label: "모집 재개하기",
        tone: "brand",
      },
    ];
  }

  return [];
}

function formatScheduleOptions(scheduleOptions: string[]) {
  if (!scheduleOptions.length) {
    return "협의 후 결정";
  }

  return scheduleOptions.join(" · ");
}

function formatPostLocation(post: InterviewPost) {
  return post.location_place_name || post.location_address || post.location_text || post.location || "장소 협의";
}

function StatusPill({ status }: { status: Application["status"] }) {
  const labelByStatus: Record<Application["status"], string> = {
    applied: "신청",
    selected: "선정",
    rejected: "반려",
    canceled: "취소",
    no_show: "불참",
    completed: "완료",
  };

  const toneByStatus: Record<Application["status"], "neutral" | "brand" | "danger"> = {
    applied: "neutral",
    selected: "brand",
    rejected: "danger",
    canceled: "neutral",
    no_show: "danger",
    completed: "neutral",
  };

  return <StatusTag label={labelByStatus[status]} tone={toneByStatus[status]} />;
}

function StatusTag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "brand" | "danger" }) {
  const tagClassName =
    tone === "brand"
      ? "rounded-full bg-[#E4F1E7] px-[9px] py-[5px]"
      : tone === "danger"
        ? "rounded-full bg-hypo-dangerSoft px-[9px] py-[5px]"
        : "rounded-full bg-hypo-bg px-[9px] py-[5px]";
  const textClassName =
    tone === "brand"
      ? "text-[11px] font-black text-hypo-brand"
      : tone === "danger"
        ? "text-[11px] font-black text-hypo-danger"
        : "text-[11px] font-black text-hypo-muted";

  return (
    <View className={tagClassName}>
      <Text className={textClassName}>{label}</Text>
    </View>
  );
}
