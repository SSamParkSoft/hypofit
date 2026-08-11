import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Application, InterviewMode, InterviewPost } from "@hypofit/contracts";
import { canUseFounderTools, formatRecruitCount, formatReward, interviewModeLabels } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useCreateApplication } from "@/features/applications/useApplicationMutations";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { CreateApplicationInput } from "@/shared/api/applications";
import { formatFounderReviewSummary } from "@/shared/format/reviews";
import { colors } from "@/shared/theme/tokens";
import { ListSection } from "@/shared/ui/ListSurface";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { SearchField } from "@/shared/ui/SearchField";

type ModeFilter = "all" | InterviewMode;
type RewardFilter = "all" | "lte10000" | "gte20000" | "gte30000" | "gte50000" | "gte70000";
type RewardRange = { rewardMin?: number; rewardMax?: number };
type NearbyRadiusM = 1000 | 3000 | 5000 | 10000 | 20000;
type LocationFilter = "all" | NearbyRadiusM;

const modeFilters: Array<{ label: string; value: ModeFilter }> = [
  { label: "전체", value: "all" },
  { label: "화상", value: "online" },
  { label: "대면", value: "offline" },
  { label: "대면/화상", value: "both" },
];

const rewardFilters: Array<{ label: string; value: RewardFilter }> = [
  { label: "전체", value: "all" },
  { label: "1만원 이하", value: "lte10000" },
  { label: "2만원 이상", value: "gte20000" },
  { label: "3만원 이상", value: "gte30000" },
  { label: "5만원 이상", value: "gte50000" },
  { label: "7만원 이상", value: "gte70000" },
];
const nearbyRadiusOptions: Array<{ label: string; value: NearbyRadiusM }> = [
  { label: "1km", value: 1000 },
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "10km", value: 10000 },
  { label: "20km", value: 20000 },
];

export function InterviewSearchScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, appUser } = useAuth();
  const [nearbyCenter, setNearbyCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [pendingLocationRadiusM, setPendingLocationRadiusM] = useState<NearbyRadiusM | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = debouncedQuery.trim();
  const rewardRange = useMemo(() => getRewardRange(rewardFilter), [rewardFilter]);
  const {
    data: posts = [],
    isError,
    isLoading,
    refetch: refetchInterviewPosts,
  } = useInterviewPosts({
    status: "open",
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    ...(modeFilter !== "all" ? { mode: modeFilter } : {}),
    ...(rewardRange.rewardMin !== undefined ? { rewardMin: rewardRange.rewardMin } : {}),
    ...(rewardRange.rewardMax !== undefined ? { rewardMax: rewardRange.rewardMax } : {}),
    ...(locationFilter !== "all" && nearbyCenter
      ? { lat: nearbyCenter.lat, lng: nearbyCenter.lng, radiusM: locationFilter, sort: "distance" as const }
      : {}),
  });
  const { data: applications = [], refetch: refetchApplications } = useApplications(accessToken);
  const { data: postViews = [], refetch: refetchPostViews } = useInterviewPostViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);

  const applicationByPostId = useMemo(
    () => new Map(applications.map((application) => [application.interview_post_id, application])),
    [applications],
  );
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
  const canCreateAndManagePosts = canUseFounderTools(appUser?.role);
  const activeFilterCount =
    Number(modeFilter !== "all") + Number(rewardFilter !== "all") + Number(locationFilter !== "all");

  const filteredPosts = posts;
  const hasFilteredPosts = !isLoading && !isError && filteredPosts.length > 0;

  const clearFilters = () => {
    setModeFilter("all");
    setRewardFilter("all");
    setLocationFilter("all");
    setLocationMessage(null);
  };

  const refreshInterviewSearch = useCallback(async () => {
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

  const enableNearbyFilter = async (radiusM: NearbyRadiusM) => {
    setIsRequestingLocation(true);
    setPendingLocationRadiusM(radiusM);
    setLocationMessage(null);

    try {
      const existingPermission = await Location.getForegroundPermissionsAsync();
      let permissionStatus = existingPermission.status;

      if (permissionStatus === Location.PermissionStatus.DENIED && !existingPermission.canAskAgain) {
        setLocationFilter("all");
        setLocationMessage("위치 권한을 허용하면 거리 기준으로 볼 수 있어요.");
        return;
      }

      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        const requestedPermission = await Location.requestForegroundPermissionsAsync();
        permissionStatus = requestedPermission.status;
      }

      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        setLocationFilter("all");
        setLocationMessage("위치 권한을 허용하면 거리 기준으로 볼 수 있어요.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setNearbyCenter({ lat: current.coords.latitude, lng: current.coords.longitude });
      setLocationFilter(radiusM);
    } catch {
      setLocationFilter("all");
      setLocationMessage("현재 위치를 확인하지 못했어요.");
    } finally {
      setIsRequestingLocation(false);
      setPendingLocationRadiusM(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg" edges={["top", "left", "right"]}>
      <View className="flex-1 gap-4 px-4 pt-4">
        <View className="min-h-[34px] flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 pl-1">
            <Text className="text-[22px] font-black leading-[29px] text-hypo-text">인터뷰</Text>
            <Text className="mt-0.5 text-xs font-bold text-hypo-muted">조건에 맞는 인터뷰를 찾아보세요</Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="내 인터뷰 보기"
              accessibilityRole="button"
              hitSlop={12}
              className="h-11 shrink-0 flex-row items-center justify-center gap-1.5 rounded-full border border-hypo-border bg-hypo-surface px-3.5"
              onPress={() => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/interviews" } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <Feather color="#66706B" name="folder" size={14} />
              <Text className="text-xs font-black text-hypo-muted">내 인터뷰</Text>
            </Pressable>
            {canCreateAndManagePosts ? (
              <Pressable
                accessibilityLabel="모집글 만들기"
                accessibilityRole="button"
                hitSlop={12}
                className="h-11 shrink-0 flex-row items-center justify-center gap-1.5 rounded-full border border-hypo-brand bg-hypo-brand px-3.5"
                onPress={() => router.push({ pathname: "/(tabs)/interviews/new", params: { returnTo: "/(tabs)/interviews" } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
              >
                <Feather color="#FFFFFF" name="plus" size={14} />
                <Text className="text-xs font-black text-white">만들기</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="min-h-0 flex-1">
          <View className="flex-row items-center gap-2">
            <SearchField
              containerClassName="h-[42px] flex-1"
              placeholder="서비스, 타깃, 지역 검색"
              returnKeyType="search"
              value={query}
              onChangeText={setQuery}
            />
            <Pressable
              accessibilityRole="button"
              className="min-h-[42px] flex-row items-center justify-center gap-1.5 rounded-xl border border-hypo-border bg-hypo-surface px-3"
              onPress={() => setIsFilterOpen(true)}
            >
              <Feather color="#1D2522" name="sliders" size={17} />
              <Text className="text-[13px] font-black text-hypo-text">필터</Text>
              {activeFilterCount ? (
                <View className="h-5 min-w-5 items-center justify-center rounded-full bg-hypo-brand">
                  <Text className="text-[11px] font-black text-white">{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {activeFilterCount ? (
            <View className="mt-2 h-8 justify-center">
              <ScrollView
                horizontal
                contentContainerClassName="items-center gap-2"
                showsHorizontalScrollIndicator={false}
              >
                {modeFilter !== "all" ? (
                  <ActiveChip label={interviewModeLabels[modeFilter]} onPress={() => setModeFilter("all")} />
                ) : null}
                {rewardFilter !== "all" ? (
                  <ActiveChip
                    label={rewardFilters.find((filter) => filter.value === rewardFilter)?.label ?? "사례비"}
                    onPress={() => setRewardFilter("all")}
                  />
                ) : null}
                {locationFilter !== "all" ? (
                  <ActiveChip label={formatRadius(locationFilter)} onPress={() => setLocationFilter("all")} />
                ) : null}
                <View className="rounded-full bg-hypo-bg px-2.5 py-1">
                  <Text className="text-[11px] font-black leading-4 text-hypo-muted">{filteredPosts.length}개</Text>
                </View>
              </ScrollView>
            </View>
          ) : null}
          {locationMessage ? (
            <Text className="mt-1 rounded-xl bg-hypo-bg px-3 py-2 text-[11px] font-bold leading-4 text-hypo-muted">
              {locationMessage}
            </Text>
          ) : null}

          <ListSection chrome="plain" className="mt-3 min-h-0 flex-1" surface="background">
            <ScrollView
              contentContainerStyle={hasFilteredPosts ? { paddingBottom: 0 } : { flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  colors={[colors.brand]}
                  progressBackgroundColor={colors.surface}
                  refreshing={isRefreshing}
                  tintColor={colors.brand}
                  onRefresh={refreshInterviewSearch}
                />
              }
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? <StateMessage title="모집글을 불러오는 중입니다." loading /> : null}
              {isError ? (
                <StateMessage
                  title="모집글을 불러오지 못했습니다."
                  description="API 연결 상태를 확인한 뒤 다시 시도하세요."
                />
              ) : null}
              {!isLoading && !isError && filteredPosts.length === 0 ? (
                <InterviewEmptyState
                  hasAnyPosts={posts.length > 0}
                  hasFilterOrQuery={Boolean(activeFilterCount || query.trim())}
                  onClear={() => {
                    setQuery("");
                    clearFilters();
                  }}
                />
              ) : null}

              {hasFilteredPosts
                ? filteredPosts.map((post) => (
                    <View key={post.id}>
                      <InterviewSearchRow
                        canApply={Boolean(accessToken)}
                        currentUserId={appUser?.id}
                        errorMessage={
                          post.id === selectedPostId && createApplication.error instanceof Error
                            ? createApplication.error.message
                            : null
                        }
                        existingApplication={applicationByPostId.get(post.id) ?? null}
                        isApplying={post.id === selectedPostId && createApplication.isPending}
                        isExpanded={post.id === selectedPostId}
                        isViewed={viewedPostIds.has(post.id)}
                        post={post}
                        onApply={(input) => createApplication.mutate(input)}
                        onPress={() => {
                          if (accessToken) {
                            markPostViewed.mutate({ postId: post.id, source: "interviews" });
                          }
                          setSelectedPostId((current) => (current === post.id ? null : post.id));
                        }}
                      />
                    </View>
                  ))
                : null}
            </ScrollView>
          </ListSection>
        </View>
      </View>

      <FilterModal
        activeFilterCount={activeFilterCount}
        isOpen={isFilterOpen}
        isRequestingLocation={isRequestingLocation}
        locationFilter={locationFilter}
        modeFilter={modeFilter}
        pendingLocationRadiusM={pendingLocationRadiusM}
        rewardFilter={rewardFilter}
        onClear={clearFilters}
        onClose={() => setIsFilterOpen(false)}
        onLocationChange={(next) => {
          if (next === "all") {
            setLocationFilter("all");
            return;
          }
          void enableNearbyFilter(next);
        }}
        onModeChange={setModeFilter}
        onRewardChange={setRewardFilter}
      />
    </SafeAreaView>
  );
}

function InterviewSearchRow({
  canApply,
  currentUserId,
  errorMessage,
  existingApplication,
  isApplying,
  isExpanded,
  isViewed,
  onApply,
  onPress,
  post,
}: {
  canApply: boolean;
  currentUserId?: string | null;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  isApplying?: boolean;
  isExpanded: boolean;
  isViewed: boolean;
  onApply: (input: CreateApplicationInput) => void;
  onPress: () => void;
  post: InterviewPost;
}) {
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(false);
  const [experienceAnswer, setExperienceAnswer] = useState("");
  const [availableTimes, setAvailableTimes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasApplied = Boolean(existingApplication);
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const loginRoute = {
    pathname: "/(auth)/login",
    params: { returnTo: `/interviews/${post.id}?apply=1&returnTo=%2F%28tabs%29%2Finterviews` },
  } as const;
  const locationLabel = post.location_place_name ?? post.location_text ?? post.location_address ?? post.location;
  const locationOrSchedule =
    locationLabel ?? post.schedule_options[0] ?? (post.interview_mode === "online" ? "화상" : "시간 협의");
  const shouldShowLocationMeta = post.interview_mode !== "online" && Boolean(locationLabel);
  const listReviewSummary = formatFounderReviewSummary(post.founder_review_summary, { minimumCount: 3 });

  const submitApplication = () => {
    if (!canApply) {
      router.push(loginRoute);
      return;
    }
    if (isOwnPost) {
      router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/interviews" } });
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

  return (
    <View className="border-b border-hypo-border bg-transparent">
      <Pressable
        accessibilityRole="button"
        className={`${isExpanded ? "px-3.5 pb-3 pt-[18px]" : "px-3.5 py-[18px]"}`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <View className="shrink-0 rounded-full bg-[#E4F1E7] px-2 py-0.5">
                <Text className="text-[10px] font-black text-hypo-brand">{interviewModeLabels[post.interview_mode]}</Text>
              </View>
              {hasApplied ? (
                <View className="shrink-0 rounded-full bg-hypo-brandSoft px-2 py-0.5">
                  <Text className="text-[10px] font-black text-hypo-brand">신청완료</Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={isExpanded ? 2 : 1}
              className={`mt-2 text-[15px] font-black leading-[22px] ${isViewed && !isExpanded ? "text-hypo-muted" : "text-hypo-text"}`}
            >
              {post.title}
            </Text>
          </View>
          <Text className={`shrink-0 text-[14px] font-black leading-5 ${isViewed && !isExpanded ? "text-hypo-muted" : "text-[#087C43]"}`}>
            {formatReward(post.reward_amount)}
          </Text>
        </View>

        <Text
          numberOfLines={isExpanded ? 2 : 1}
          className={`mt-1.5 text-xs font-bold leading-[18px] ${isViewed && !isExpanded ? "text-[#8D958B]" : "text-hypo-muted"}`}
        >
          {isExpanded ? post.service_summary : post.target_description}
        </Text>

        {!isExpanded ? (
          <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
            <Text className="max-w-[64%] text-[11px] font-extrabold text-[#7D877A]">{post.duration_minutes}분</Text>
            <Text numberOfLines={1} className="max-w-[64%] text-[11px] font-extrabold text-[#7D877A]">
              {locationOrSchedule}
            </Text>
            {listReviewSummary ? (
              <Text numberOfLines={1} className="max-w-[72%] text-[11px] font-extrabold text-hypo-brand">
                {listReviewSummary}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {isExpanded ? (
        <View className="px-3.5 pb-4">
          <View className="gap-2">
            <InlineMeta label="일정" value={post.schedule_options.length ? post.schedule_options.join(" · ") : "모집자와 협의"} />
            <InlineMeta
              label="방식"
              value={interviewModeLabels[post.interview_mode]}
            />
            {shouldShowLocationMeta ? <InlineMeta label="위치" value={locationLabel as string} /> : null}
            <InlineMeta label="모집 인원" value={formatRecruitCount(post.recruit_count)} />
            <InlineMeta label="예상 시간" value={`${post.duration_minutes}분`} />
          </View>

          <View className="mt-4">
            <Text className="text-[11px] font-black text-hypo-text">찾는 사람</Text>
            <Text numberOfLines={3} className="mt-1.5 text-xs font-bold leading-[19px] text-hypo-muted">
              {post.target_description}
            </Text>
          </View>

          {isOwnPost ? (
            <View className="mt-4">
              <PrimaryButton
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/interviews/[postId]",
                    params: { postId: post.id, returnTo: "/(tabs)/interviews" },
                  })
                }
              >
                상세보기
              </PrimaryButton>
            </View>
          ) : hasApplied ? (
            <View className="mt-4 min-h-11 items-center justify-center rounded-xl bg-[#E4F1E7]">
              <Text className="text-sm font-black text-hypo-brand">신청완료</Text>
            </View>
          ) : !isApplyFormOpen ? (
            <View className="mt-4 flex-row gap-2">
              <PrimaryButton
                className="flex-1"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/interviews/[postId]",
                    params: { postId: post.id, returnTo: "/(tabs)/interviews" },
                  })
                }
              >
                상세보기
              </PrimaryButton>
              <PrimaryButton className="flex-1" onPress={() => (canApply ? setIsApplyFormOpen(true) : router.push(loginRoute))}>
                {canApply ? "신청하기" : "로그인 후 신청"}
              </PrimaryButton>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              <InlineTextArea
                label="관련 경험"
                placeholder="조건과 맞는 경험을 적어주세요."
                value={experienceAnswer}
                onChangeText={setExperienceAnswer}
              />
              <InlineTextArea
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
        </View>
      ) : null}
    </View>
  );
}

function InterviewEmptyState({
  hasAnyPosts,
  hasFilterOrQuery,
  onClear,
}: {
  hasAnyPosts: boolean;
  hasFilterOrQuery: boolean;
  onClear: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-hypo-brandSoft">
        <Feather color="#176B5D" name="search" size={20} />
      </View>
      <Text className="mt-4 text-center text-[15px] font-black leading-6 text-hypo-muted">
        {hasAnyPosts ? "조건에 맞는 인터뷰가 없어요" : "아직 열린 인터뷰가 없어요"}
      </Text>
      <Text className="mt-1 text-center text-xs font-bold leading-[19px] text-hypo-muted">
        {hasAnyPosts ? "검색어를 줄이거나 필터를 초기화해보세요." : "새 모집글이 올라오면 여기에서 바로 볼 수 있어요."}
      </Text>
      {hasFilterOrQuery ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-10 items-center justify-center rounded-full border border-hypo-border bg-hypo-surface px-4"
          onPress={onClear}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <Text className="text-xs font-black text-hypo-text">검색 조건 지우기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="w-[58px] text-xs font-black text-[#7D877A]">{label}</Text>
      <Text numberOfLines={1} className="min-w-0 flex-1 text-xs font-extrabold text-hypo-text">
        {value}
      </Text>
    </View>
  );
}

function InlineTextArea({
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

function ActiveChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" className="rounded-full bg-[#E4F1E7] px-3 py-1" onPress={onPress}>
      <Text className="text-xs font-black leading-4 text-hypo-brand">{label} ×</Text>
    </Pressable>
  );
}

function FilterModal({
  activeFilterCount,
  isOpen,
  isRequestingLocation,
  locationFilter,
  modeFilter,
  onClear,
  onClose,
  onLocationChange,
  onModeChange,
  onRewardChange,
  pendingLocationRadiusM,
  rewardFilter,
}: {
  activeFilterCount: number;
  isOpen: boolean;
  isRequestingLocation: boolean;
  locationFilter: LocationFilter;
  modeFilter: ModeFilter;
  onClear: () => void;
  onClose: () => void;
  onLocationChange: (location: LocationFilter) => void;
  onModeChange: (mode: ModeFilter) => void;
  onRewardChange: (reward: RewardFilter) => void;
  pendingLocationRadiusM: NearbyRadiusM | null;
  rewardFilter: RewardFilter;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable accessibilityLabel="필터 닫기" className="absolute inset-0" onPress={onClose} />
        <View
          className="rounded-t-[22px] bg-hypo-surface px-5 pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom + 20, 28) }}
        >
          <View className="mb-3 self-center h-1 w-[42px] rounded-full bg-hypo-border" />
          <View className="flex-row justify-between gap-4">
            <View>
              <Text className="text-xl font-black text-hypo-text">필터</Text>
              <Text className="mt-1 text-[13px] font-bold leading-[19px] text-hypo-muted">조건을 골라 맞는 인터뷰만 볼 수 있어요.</Text>
            </View>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
              <Text className="text-[13px] font-black text-hypo-muted">닫기</Text>
            </Pressable>
          </View>

          <FilterGroup label="진행 방식">
            {modeFilters.map((filter) => (
              <FilterChip
                key={filter.value}
                isSelected={modeFilter === filter.value}
                label={filter.label}
                onPress={() => onModeChange(filter.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="사례비">
            {rewardFilters.map((filter) => (
              <FilterChip
                key={filter.value}
                isSelected={rewardFilter === filter.value}
                label={filter.label}
                onPress={() => onRewardChange(filter.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="위치">
            <FilterChip
              isSelected={locationFilter === "all"}
              label="전체"
              onPress={() => onLocationChange("all")}
            />
            {nearbyRadiusOptions.map((option) => (
              <FilterChip
                key={option.value}
                isSelected={locationFilter === option.value}
                label={isRequestingLocation && pendingLocationRadiusM === option.value ? "위치 확인 중" : option.label}
                onPress={() => onLocationChange(option.value)}
              />
            ))}
          </FilterGroup>

          <View className="mt-6 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={!activeFilterCount}
              className="min-h-[52px] flex-1 items-center justify-center rounded-[14px] border border-hypo-border bg-hypo-surface"
              style={{ opacity: activeFilterCount ? 1 : 0.45 }}
              onPress={onClear}
            >
              <Text className="text-[15px] font-black text-hypo-text">초기화</Text>
            </Pressable>
            <Pressable accessibilityRole="button" className="min-h-[52px] flex-1 items-center justify-center rounded-[14px] bg-hypo-brand" onPress={onClose}>
              <Text className="text-[15px] font-black text-white">결과 보기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="mt-[22px] gap-2">
      <Text className="text-xs font-black text-[#7D877A]">{label}</Text>
      <ScrollView horizontal contentContainerClassName="gap-2 pr-4" showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

function formatRadius(radiusM: NearbyRadiusM) {
  return radiusM < 1000 ? `${radiusM}m` : `${radiusM / 1000}km`;
}

function getRewardRange(rewardFilter: RewardFilter): RewardRange {
  switch (rewardFilter) {
    case "all":
      return {};
    case "lte10000":
      return { rewardMax: 10000 };
    case "gte20000":
      return { rewardMin: 20000 };
    case "gte30000":
      return { rewardMin: 30000 };
    case "gte50000":
      return { rewardMin: 50000 };
    case "gte70000":
      return { rewardMin: 70000 };
  }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function FilterChip({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-[42px] justify-center rounded-full border px-3.5 ${
        isSelected ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"
      }`}
      onPress={onPress}
    >
      <Text className={`text-[13px] font-black ${isSelected ? "text-white" : "text-hypo-muted"}`}>{label}</Text>
    </Pressable>
  );
}
