import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { canUseFounderTools, formatRecruitCount, formatReward, interviewModeLabels } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useCreateApplication } from "@/features/applications/useApplicationMutations";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { useAuth } from "@/features/auth/AuthProvider";
import type { CreateApplicationInput } from "@/shared/api/applications";
import { formatFounderReviewSummary } from "@/shared/format/reviews";
import { colors } from "@/shared/theme/tokens";
import { ListRow, SelectionPanel } from "@/shared/ui/ListSurface";
import { NotificationButton } from "@/shared/ui/NotificationButton";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";

export function HomeScreen() {
  const { accessToken, appUser } = useAuth();
  const params = useLocalSearchParams<{ welcome?: string }>();
  const {
    data: interviewPosts = [],
    isError,
    isLoading,
    refetch: refetchInterviewPosts,
  } = useInterviewPosts({
    status: "open",
    sort: "newest",
  });
  const { data: applications = [], refetch: refetchApplications } = useApplications(accessToken);
  const { data: postViews = [], refetch: refetchPostViews } = useInterviewPostViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(params.welcome === "1");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedApplicationCount = useMemo(
    () => applications.filter((application) => application.status === "selected").length,
    [applications],
  );
  const ownOpenPostIds = useMemo(() => {
    if (!appUser) {
      return new Set<string>();
    }

    return new Set(
      interviewPosts
        .filter((post) => post.founder_id === appUser.id)
        .map((post) => post.id),
    );
  }, [appUser, interviewPosts]);
  const applicantCount = useMemo(
    () => applications.filter((application) => ownOpenPostIds.has(application.interview_post_id)).length,
    [applications, ownOpenPostIds],
  );
  const ownOpenPostCount = ownOpenPostIds.size;
  const canManagePosts = canUseFounderTools(appUser?.role);
  const openPostCount = interviewPosts.length;
  const viewedPostCount = postViews.length;
  const hasRecentInterviews = !isLoading && !isError && interviewPosts.length > 0;

  const applicationByPostId = useMemo(
    () => new Map(applications.map((application) => [application.interview_post_id, application])),
    [applications],
  );
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );

  const togglePost = (postId: string) => {
    if (accessToken) {
      markPostViewed.mutate({ postId, source: "home" });
    }

    setSelectedPostId((current) => (current === postId ? null : postId));
  };

  const refreshHome = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchInterviewPosts(),
        ...(accessToken ? [refetchApplications(), refetchPostViews()] : []),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, isRefreshing, refetchApplications, refetchInterviewPosts, refetchPostViews]);

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 gap-4 px-4 pb-2 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-row items-center gap-2.5">
              <Image
                accessibilityIgnoresInvertColors
                className="h-[34px] w-[34px]"
                resizeMode="contain"
                source={require("../../../assets/hypofit-mark.png")}
              />
              <Text className="text-[19px] font-black text-hypo-text">Hypofit</Text>
            </View>
            <NotificationButton returnTo="/(tabs)/home" />
          </View>

          <HomeProgressSection
            applicationCount={applications.length}
            applicantCount={applicantCount}
            canManagePosts={canManagePosts}
            ownOpenPostCount={ownOpenPostCount}
            selectedApplicationCount={selectedApplicationCount}
            viewedPostCount={viewedPostCount}
          />

          <View className="min-h-0 flex-1">
            <View className="flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-[22px] font-black leading-[29px] text-hypo-text">최근 올라온 인터뷰</Text>
                <Text className="mt-0.5 text-xs font-bold leading-[18px] text-hypo-muted">관심 있는 모집글을 눌러 조건을 확인해보세요.</Text>
              </View>
              <View className="rounded-full bg-hypo-surface px-2.5 py-1">
                <Text className="text-[11px] font-black text-hypo-muted">{interviewPosts.length}개</Text>
              </View>
            </View>

            <View className="mt-3 min-h-0 flex-1">
              <ScrollView
                contentContainerStyle={hasRecentInterviews ? undefined : { flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    colors={[colors.brand]}
                    progressBackgroundColor={colors.surface}
                    refreshing={isRefreshing}
                    tintColor={colors.brand}
                    onRefresh={refreshHome}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? <StateMessage title="모집글을 불러오는 중입니다." loading /> : null}

                {isError ? (
                  <StateMessage title="모집글을 불러오지 못했습니다." description="API 연결 상태를 확인한 뒤 다시 시도하세요." />
                ) : null}

                {!isLoading && !isError && interviewPosts.length === 0 ? (
                  <StateMessage title="아직 열린 인터뷰가 없어요." description="새 모집글이 올라오면 여기에서 바로 볼 수 있어요." />
                ) : null}

                {hasRecentInterviews
                  ? interviewPosts.map((post) => (
                      <View key={post.id}>
                        <OpportunityRow
                          isSelected={post.id === selectedPostId}
                          isViewed={viewedPostIds.has(post.id)}
                          post={post}
                          rowAppearance="flat"
                          rowSize="comfortable"
                          onPress={() => togglePost(post.id)}
                        />
                        {post.id === selectedPostId ? (
                          <ExpandedOpportunity
                            canApply={Boolean(accessToken)}
                            currentUserId={appUser?.id}
                            errorMessage={
                              createApplication.error instanceof Error ? createApplication.error.message : null
                            }
                            existingApplication={applicationByPostId.get(post.id) ?? null}
                            chrome="inline"
                            isApplying={createApplication.isPending}
                            post={post}
                            onApply={(input) => createApplication.mutate(input)}
                          />
                        ) : null}
                      </View>
                    ))
                  : null}
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => {
          setIsWelcomeOpen(false);
          router.setParams({ welcome: undefined });
        }}
      />
    </SafeAreaView>
  );
}

function HomeProgressSection({
  applicationCount,
  applicantCount,
  canManagePosts,
  ownOpenPostCount,
  selectedApplicationCount,
  viewedPostCount,
}: {
  applicationCount: number;
  applicantCount: number;
  canManagePosts: boolean;
  ownOpenPostCount: number;
  selectedApplicationCount: number;
  viewedPostCount: number;
}) {
  const summary = canManagePosts
    ? {
        helper: "열린 모집글 기준",
        primaryLabel: "내 모집글",
        primaryValue: `${ownOpenPostCount}개`,
        secondary: [
          { label: "지원자", value: `${applicantCount}명` },
          { label: "신청", value: `${applicationCount}개` },
        ],
      }
    : {
        helper: "내가 참여할 인터뷰 기준",
        primaryLabel: "신청",
        primaryValue: `${applicationCount}개`,
        secondary: [
          { label: "선정", value: `${selectedApplicationCount}개` },
          { label: "읽은 모집글", value: `${viewedPostCount}개` },
        ],
      };

  return (
    <View className="py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-black leading-5 text-hypo-text">내 진행 상황</Text>
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-1"
          hitSlop={10}
          onPress={() => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/home" } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
        >
          <Text className="text-[11px] font-black text-hypo-muted">내 인터뷰</Text>
          <Feather color="#66706B" name="chevron-right" size={13} />
        </Pressable>
      </View>

      <View className="mt-3 rounded-[15px] border border-hypo-border bg-hypo-surface px-4 py-3.5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-bold leading-[18px] text-hypo-muted">{summary.primaryLabel}</Text>
            <Text className="mt-1 text-[24px] font-black leading-[30px] text-hypo-brand">{summary.primaryValue}</Text>
          </View>
          <Text className="shrink-0 text-[11px] font-bold leading-4 text-hypo-muted">{summary.helper}</Text>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          {summary.secondary.map((metric, index) => (
            <ProgressMetric key={metric.label} isLast={index === summary.secondary.length - 1} label={metric.label} value={metric.value} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ProgressMetric({
  isLast,
  label,
  value,
}: {
  isLast: boolean;
  label: string;
  value: string;
}) {
  return (
    <View className={`min-w-0 flex-row items-center gap-1.5 ${isLast ? "flex-1" : ""}`}>
      <Text className="text-[12px] font-bold leading-[18px] text-hypo-muted">{label}</Text>
      <Text className="text-[13px] font-black leading-[18px] text-hypo-text">{value}</Text>
      {!isLast ? <View className="ml-0.5 h-3 w-px bg-hypo-border" /> : null}
    </View>
  );
}

function WelcomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-6">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[24px] bg-[#FFFEFB] px-5 py-5">
          <Text className="text-[22px] leading-[30px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
            회원가입이 완료됐어요
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
            이제 나에게 맞는 검증 인터뷰를 확인하고 바로 신청할 수 있어요.
          </Text>
          <View className="mt-5">
            <PrimaryButton onPress={onClose}>홈에서 둘러보기</PrimaryButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function OpportunityRow({
  isSelected,
  isViewed,
  onPress,
  post,
  rowAppearance = "default",
  rowSize = "default",
}: {
  isSelected?: boolean;
  isViewed?: boolean;
  onPress: () => void;
  post: InterviewPost;
  rowAppearance?: "default" | "flat";
  rowSize?: "default" | "comfortable";
}) {
  const locationOrSchedule =
    post.location ?? post.schedule_options[0] ?? (post.interview_mode === "online" ? "화상" : "시간 협의");
  const listReviewSummary = formatFounderReviewSummary(post.founder_review_summary, { minimumCount: 3 });

  return (
    <ListRow appearance={rowAppearance} isSelected={isSelected} isViewed={isViewed} size={rowSize} onPress={onPress}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          <View className="shrink-0 rounded-full bg-[#E4F1E7] px-2 py-0.5">
            <Text className="text-[10px] font-black text-hypo-brand">{interviewModeLabels[post.interview_mode]}</Text>
          </View>
          <Text numberOfLines={1} className={`min-w-0 flex-1 text-sm font-black leading-5 ${isViewed && !isSelected ? "text-hypo-muted" : "text-hypo-text"}`}>
            {post.title}
          </Text>
        </View>
        <Text className={`shrink-0 text-[13px] font-black leading-5 ${isViewed && !isSelected ? "text-hypo-muted" : "text-[#087C43]"}`}>
          {formatReward(post.reward_amount)}
        </Text>
      </View>
      <Text numberOfLines={1} className={`mt-1 text-[11px] font-bold leading-4 ${isViewed && !isSelected ? "text-[#8D958B]" : "text-hypo-muted"}`}>
        {post.target_description}
      </Text>
      <View className="mt-[7px] flex-row flex-wrap gap-x-3 gap-y-1">
        <Text className="max-w-[64%] text-[10px] font-extrabold text-[#7D877A]">{post.duration_minutes}분</Text>
        <Text numberOfLines={1} className="max-w-[64%] text-[10px] font-extrabold text-[#7D877A]">
          {locationOrSchedule}
        </Text>
        {listReviewSummary ? (
          <Text numberOfLines={1} className="max-w-[72%] text-[10px] font-extrabold text-hypo-brand">
            {listReviewSummary}
          </Text>
        ) : null}
      </View>
    </ListRow>
  );
}

export function ExpandedOpportunity({
  canApply,
  chrome = "card",
  currentUserId,
  errorMessage,
  existingApplication,
  initialApplyOpen = false,
  isApplying,
  onApply,
  post,
  showDetailButton = true,
}: {
  canApply: boolean;
  chrome?: "card" | "inline";
  currentUserId?: string | null;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  isApplying?: boolean;
  initialApplyOpen?: boolean;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
  showDetailButton?: boolean;
}) {
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(initialApplyOpen);
  const [experienceAnswer, setExperienceAnswer] = useState("");
  const [availableTimes, setAvailableTimes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasApplied = Boolean(existingApplication);
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const loginRoute = {
    pathname: "/(auth)/login",
    params: { returnTo: `/interviews/${post.id}?apply=1&returnTo=%2F%28tabs%29%2Fhome` },
  } as const;

  const submitApplication = () => {
    if (!canApply) {
      router.push(loginRoute);
      return;
    }
    if (isOwnPost) {
      router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/home" } });
      return;
    }

    const nextExperience = experienceAnswer.trim();
    const nextAvailableTimes = availableTimes
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!nextExperience) {
      setValidationError("조건과 맞는 경험을 적어주세요.");
      return;
    }

    if (!nextAvailableTimes.length) {
      setValidationError("참여 가능한 시간을 한 개 이상 적어주세요.");
      return;
    }

    setValidationError(null);
    onApply({
      interview_post_id: post.id,
      answers: { experience: nextExperience },
      available_times: nextAvailableTimes,
    });
  };

  const content = (
    <>
      <Text numberOfLines={2} className="text-xs font-bold leading-[19px] text-hypo-muted">
        {post.service_summary}
      </Text>

      <View className="mt-3 gap-[7px]">
        <MetaLine label="사례비" value={formatReward(post.reward_amount)} emphasized />
        <MetaLine label="모집 인원" value={formatRecruitCount(post.recruit_count)} />
        <MetaLine label="일정" value={post.schedule_options.length ? post.schedule_options.join(" · ") : "모집자와 협의"} />
        <MetaLine
          label="방식"
          value={`${interviewModeLabels[post.interview_mode]}${post.location ? ` · ${post.location}` : ""}`}
        />
      </View>

      <View className="mt-3 rounded-xl bg-hypo-surface px-3 py-2.5">
        <Text className="text-[11px] font-black text-hypo-text">찾는 응답자</Text>
        <Text numberOfLines={2} className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">
          {post.target_description}
        </Text>
      </View>

      {isOwnPost ? (
        <View className="mt-3 rounded-xl bg-hypo-surface px-3 py-2.5">
          <Text className="text-sm font-black text-hypo-text">내가 만든 모집글이에요</Text>
          <Text className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">
            신청 대신 내 인터뷰에서 지원자를 확인해보세요.
          </Text>
        </View>
      ) : hasApplied ? (
        <View className="mt-3 min-h-11 items-center justify-center rounded-xl bg-[#E4F1E7]">
          <Text className="text-sm font-black text-hypo-brand">신청완료</Text>
        </View>
      ) : !isApplyFormOpen ? (
        <View className={`mt-4 ${showDetailButton ? "flex-row gap-2" : ""}`}>
          {showDetailButton ? (
            <PrimaryButton
              className="flex-1"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/interviews/[postId]",
                  params: { postId: post.id, returnTo: "/(tabs)/home" },
                })
              }
            >
              상세보기
            </PrimaryButton>
          ) : null}
          <PrimaryButton
            className={showDetailButton ? "flex-1" : "w-full"}
            onPress={() => (canApply ? setIsApplyFormOpen(true) : router.push(loginRoute))}
          >
            {canApply ? "신청하기" : "로그인 후 신청"}
          </PrimaryButton>
        </View>
      ) : (
        <View className="mt-3 gap-3 rounded-xl border border-hypo-border bg-hypo-surface p-3">
          <FieldTextArea
            label="관련 경험"
            placeholder="조건과 맞는 경험을 적어주세요."
            value={experienceAnswer}
            onChangeText={setExperienceAnswer}
          />
          <FieldTextArea
            label="가능 시간"
            placeholder="예: 평일 20시 이후"
            value={availableTimes}
            onChangeText={setAvailableTimes}
          />
          {validationError || errorMessage ? (
            <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">{validationError ?? errorMessage}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <PrimaryButton
              className="flex-1"
              variant="secondary"
              onPress={() => {
                setIsApplyFormOpen(false);
                setValidationError(null);
              }}
            >
              취소
            </PrimaryButton>
            <PrimaryButton className="flex-1" disabled={isApplying} onPress={submitApplication}>
              {isApplying ? "신청 중" : "신청하기"}
            </PrimaryButton>
          </View>
        </View>
      )}
    </>
  );

  if (chrome === "inline") {
    return (
      <View className="border-b border-hypo-border bg-transparent px-3.5 pb-4">
        {content}
      </View>
    );
  }

  return (
    <SelectionPanel>
      {content}
    </SelectionPanel>
  );
}

function MetaLine({ emphasized, label, value }: { emphasized?: boolean; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="w-11 text-xs font-black text-[#7D877A]">{label}</Text>
      <Text numberOfLines={1} className={`min-w-0 flex-1 text-xs font-extrabold ${emphasized ? "text-[#087C43]" : "text-hypo-text"}`}>
        {value}
      </Text>
    </View>
  );
}

function FieldTextArea({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-black text-hypo-text">{label}</Text>
      <TextInput
        multiline
        placeholder={placeholder}
        placeholderTextColor="#9AA399"
        className="min-h-[82px] rounded-xl border border-hypo-border bg-hypo-surface px-3 py-2.5 text-sm font-bold leading-5 text-hypo-text"
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function StateMessage({
  description,
  loading,
  title,
}: {
  description?: string;
  loading?: boolean;
  title: string;
}) {
  return (
    <View className="min-h-40 items-center justify-center gap-2 rounded-[14px] bg-hypo-bg p-4">
      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      <Text className="text-center text-[15px] font-black text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>{title}</Text>
      {description ? <Text className="text-center text-[13px] font-bold leading-5 text-hypo-muted">{description}</Text> : null}
    </View>
  );
}
