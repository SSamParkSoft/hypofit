import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, type Href, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { formatUserDisplayName } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useUpdateApplicationStatus } from "@/features/applications/useApplicationMutations";
import { useChatRooms } from "@/features/chat/useChat";
import {
  useInterviewPosts,
  useUpdateInterviewPostLifecycle,
  type InterviewPostLifecycleAction,
} from "@/features/interview-posts/useInterviewPosts";
import { useSessions } from "@/features/sessions/useSessions";
import { SurveyOwnerParticipants } from "@/features/surveys/SurveyOwnerParticipants";
import {
  buildApplicationReadModels,
  formatAnswerLabel,
  type ApplicationReadModel,
} from "@/features/workflow/readModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/screens/home/HomeScreen";
import { getPostingCompensationLabel, getPostingModeLabel, getPostingTypeLabel } from "@/shared/format/postings";
import { goBackOrReplaceFallback, resolveReturnTo } from "@/shared/navigation/backNavigation";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type MyInterviewTab = "applications" | "posts";
type ApplicantManagementTab = "applicants" | "in_progress" | "completed";

export function MyInterviewsScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[]; tab?: MyInterviewTab | MyInterviewTab[] }>();
  const pathname = usePathname();
  const isHomeActivityRoute = pathname.startsWith("/home/");
  const activityRoot = isHomeActivityRoute ? "/(tabs)/home/my-interviews" : "/(tabs)/interviews/my-interviews";
  const backTo = resolveReturnTo(params.returnTo, isHomeActivityRoute ? "/(tabs)/home" : "/(tabs)/interviews");
  const { accessToken, appUser } = useAuth();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const [activeTab, setActiveTab] = useState<MyInterviewTab>(requestedTab === "posts" ? "posts" : "applications");
  const activityReturnTo = `${activityRoot}?tab=${activeTab}&returnTo=${encodeURIComponent(String(backTo))}`;

  useEffect(() => {
    if (requestedTab === "applications" || requestedTab === "posts") {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);
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
    () => (appUser ? posts.filter((post) => post.founder_id === appUser.id) : []),
    [appUser, posts],
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

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} />
          <StateMessage title="로그인이 필요해요." description="신청한 공고와 내 공고의 진행 상태는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header backTo={backTo} />

        <View className="mb-3 mt-2 flex-row rounded-[12px] bg-hypo-surface p-1">
          <SegmentButton
            count={myApplicationRows.length}
            isActive={activeTab === "applications"}
            label="내 참여"
            onPress={() => setActiveTab("applications")}
          />
          <SegmentButton
            count={myFounderPosts.length}
            isActive={activeTab === "posts"}
            label="내 공고"
            onPress={() => setActiveTab("posts")}
          />
        </View>

        {isLoading ? <StateMessage title="내 활동을 불러오는 중이에요." loading /> : null}
        {isError ? (
          <StateMessage
            title="내 활동을 불러오지 못했어요."
            description="잠시 후 다시 시도해 주세요."
          />
        ) : null}

        {!isLoading && !isError ? (
          <ScrollView contentContainerClassName="pb-24" showsVerticalScrollIndicator={false}>
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
                            returnTo: activityReturnTo,
                          },
                        })
                      }
                    />
                  ))}
                </ListSection>
              ) : (
                <StateMessage title="아직 참여한 공고가 없어요." description="관심 있는 공고를 찾아 신청하면 진행 상태를 볼 수 있어요." />
              )
            ) : null}

            {activeTab === "posts" ? (
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
                            returnTo: activityReturnTo,
                          },
                        })
                      }
                    />
                  ))}
                </ListSection>
              ) : (
                <StateMessage title="아직 만든 공고가 없어요." description="공고 탭에서 공고를 만들면 참여자와 진행 상태를 관리할 수 있어요." />
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
  const [activeApplicantTab, setActiveApplicantTab] = useState<ApplicantManagementTab>("applicants");
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
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
  const canAccessPost = Boolean(appUser && post && post.founder_id === appUser.id);
  const canEditPost = Boolean(post && canFounderChangePostContent(post.status));
  const canDeletePost = Boolean(post && canFounderDeletePost(post.status));
  const managementReturnTo = postId
    ? `/(tabs)/interviews/my-posts/${postId}`
    : "/(tabs)/interviews/my-interviews";

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <Header backTo={backTo} title="내 공고" />
          <StateMessage title="로그인이 필요해요." description="내가 만든 공고는 로그인 후 관리할 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header
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
            <FounderPostManagementContext
              applications={postApplications}
              post={post}
              onPreview={() =>
                router.push({
                  pathname: "/interviews/[postId]",
                  params: { postId: post.id, returnTo: managementReturnTo },
                })
              }
            />
            {!(post.recruitment_type === "survey" && post.entry_mode === "direct") && <FounderPostApplicantsView
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

function Header({
  backTo = "/(tabs)/interviews",
  right,
  title = "내 활동",
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
      <Text numberOfLines={1} className="flex-1 text-lg font-bold text-hypo-text">{title}</Text>
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
      <Text className={`text-[13px] font-semibold ${isActive ? "text-white" : "text-hypo-muted"}`}>{label}</Text>
      <View className={`min-w-[22px] items-center rounded-full px-[7px] py-[3px] ${isActive ? "bg-white/20" : "bg-hypo-bg"}`}>
        <Text className={`text-[11px] font-semibold ${isActive ? "text-white" : "text-hypo-muted"}`}>{count}</Text>
      </View>
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

function ApplicationRow({ model, onPress }: { model: ApplicationReadModel; onPress: () => void }) {
  const displayStatus = getApplicationDisplayStatus(model.application.status, model.session?.status);

  return (
    <ListRow appearance="flat" className="py-4" onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-semibold leading-[22px] text-hypo-text">
            {model.displayTitle}
          </Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {model.post ? (
              <>
                <Text className="text-[12px] font-medium text-hypo-brand">{getPostingCompensationLabel(model.post)}</Text>
                <Text className="text-[12px] text-hypo-muted">{`${getPostingTypeLabel(model.post)} · ${getPostingModeLabel(model.post)}`}</Text>
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
          <Text numberOfLines={1} className="text-[16px] font-semibold leading-[22px] text-hypo-text">{post.title}</Text>
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

function canFounderChangePostContent(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
}

function canFounderDeletePost(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
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

function FounderPostManagementContext({
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
          <Feather color="#0F7A4D" name="eye" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function FounderPostApplicantsView({
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
  const emptyCopyByTab: Record<ApplicantManagementTab, { description: string; title: string }> = {
    applicants: {
      title: "지원자가 없어요.",
      description: "새 지원자가 생기면 이곳에서 내용을 확인할 수 있어요.",
    },
    in_progress: {
      title: "진행 중인 참여자가 없어요.",
      description: "선정한 지원자는 이곳에서 채팅과 일정을 관리할 수 있어요.",
    },
    completed: {
      title: "완료된 참여가 없어요.",
      description: "인터뷰를 마친 지원자가 이곳에 모여요.",
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
  const respondentLabel = formatUserDisplayName(application.respondent);
  const applicantDetailReturnTo = returnTo;
  const experience = application.answers.relevant_experience ?? application.answers.experience;
  const availableTimes = application.available_times.slice(0, 2).join(" · ");
  const canOpenChat = Boolean(roomId && canOpenApplicantChat(application.status));
  const shouldShowStatus = application.status !== "applied";

  return (
    <ListRow
      accessibilityHint="두 번 탭하여 지원 내용을 확인합니다"
      accessibilityLabel={`${respondentLabel} 지원 정보`}
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
              {respondentLabel}
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
          <Feather color="#69736D" name="chevron-right" size={19} />
        </View>
      </View>

      {canOpenChat && roomId ? (
        <Pressable
          accessibilityLabel={`${respondentLabel}님과 채팅 보기`}
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
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = useInterviewPosts(undefined, accessToken);
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
          <Header backTo={backTo} title="지원자 정보" />
          <StateMessage title="로그인이 필요해요." description="지원자 정보는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <Header backTo={backTo} title="지원 정보" />

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

function canOpenApplicantChat(status: Application["status"]) {
  return status === "selected" || status === "completed" || status === "no_show";
}

function ApplicantIdentityHeader({ application, post }: { application: Application; post: InterviewPost }) {
  const respondentLabel = formatUserDisplayName(application.respondent);
  const status = getApplicantManagementStatus(application.status);

  return (
    <View className="mt-5 border-b border-hypo-border pb-5">
      <View className="flex-row items-center gap-3">
        <ApplicantAvatar application={application} size="large" />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-[20px] font-bold leading-7 text-hypo-text">
              {respondentLabel}
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

function ApplicantAvatar({ application, size }: { application: Application; size: "small" | "large" }) {
  const respondent = application.respondent;
  const name = formatUserDisplayName(respondent);
  return (
    <UserAvatar
      iconSize={size === "large" ? 24 : 20}
      imageUrl={respondent?.profile_image_url}
      name={name}
      sizeClassName={size === "large" ? "h-12 w-12" : "h-10 w-10"}
    />
  );
}

function getApplicantManagementStatus(status: Application["status"]): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  if (status === "applied") return { label: "검토 대기", tone: "neutral" };
  if (status === "selected") return { label: "진행 중", tone: "brand" };
  if (status === "completed") return { label: "인터뷰 완료", tone: "neutral" };
  if (status === "no_show") return { label: "불참", tone: "danger" };
  if (status === "rejected") return { label: "반려", tone: "danger" };
  return { label: "취소", tone: "neutral" };
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
