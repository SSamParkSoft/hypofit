import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { InterviewMode } from "@hypofit/contracts";
import { interviewModeLabels } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { useAuth } from "@/features/auth/AuthProvider";
import { PostingDiscoveryRow } from "@/features/interview-posts/PostingDiscoveryRow";
import {
  hasDraftContent,
  loadPostingCreationDraft,
} from "@/features/interview-posts/postingCreationDraft";
import { getBottomTabBarHeight } from "@/shared/navigation/tabBarStyle";
import { colors } from "@/shared/theme/tokens";
import { ListSection } from "@/shared/ui/ListSurface";
import { SearchField } from "@/shared/ui/SearchField";

type ModeFilter = "all" | InterviewMode;
type RewardFilter =
  | "all"
  | "lte10000"
  | "gte20000"
  | "gte30000"
  | "gte50000"
  | "gte70000";
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
  const listBottomInset = getBottomTabBarHeight(insets.bottom) + 16;
  const { accessToken, appUser } = useAuth();
  const [nearbyCenter, setNearbyCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [pendingLocationRadiusM, setPendingLocationRadiusM] =
    useState<NearbyRadiusM | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const openCreationForm = (draftAction: "new" | "resume") => {
    router.push({
      pathname: "/interviews/new",
      params: { returnTo: "/(tabs)/interviews", draftAction },
    });
  };
  const handleCreatePress = () => {
    void loadPostingCreationDraft().then((stored) => {
      if (!stored || !hasDraftContent(stored)) {
        openCreationForm("new");
        return;
      }

      Alert.alert(
        "작성 중인 공고가 있어요",
        "이어서 작성하거나 새 공고를 만들 수 있어요.",
        [
          { text: "취소", style: "cancel" },
          { text: "새 공고 만들기", onPress: () => openCreationForm("new") },
          { text: "계속 작성", onPress: () => openCreationForm("resume") },
        ],
      );
    });
  };
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = debouncedQuery.trim();
  const rewardRange = useMemo(
    () => getRewardRange(rewardFilter),
    [rewardFilter],
  );
  const {
    data: posts = [],
    isError,
    isLoading,
    refetch: refetchInterviewPosts,
  } = useInterviewPosts({
    status: "open",
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    ...(modeFilter !== "all" ? { mode: modeFilter } : {}),
    ...(rewardRange.rewardMin !== undefined
      ? { rewardMin: rewardRange.rewardMin }
      : {}),
    ...(rewardRange.rewardMax !== undefined
      ? { rewardMax: rewardRange.rewardMax }
      : {}),
    ...(locationFilter !== "all" && nearbyCenter
      ? {
          lat: nearbyCenter.lat,
          lng: nearbyCenter.lng,
          radiusM: locationFilter,
          sort: "distance" as const,
        }
      : {}),
  });
  const { data: applications = [], refetch: refetchApplications } =
    useApplications(accessToken);
  const { data: postViews = [] } = useInterviewPostViews(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);

  const applicationByPostId = useMemo(
    () =>
      new Map(
        applications.map((application) => [
          application.interview_post_id,
          application,
        ]),
      ),
    [applications],
  );
  const canCreateAndManagePosts = Boolean(accessToken && appUser);
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
  const activeFilterCount =
    Number(modeFilter !== "all") +
    Number(rewardFilter !== "all") +
    Number(locationFilter !== "all");

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
        ...(accessToken ? [refetchApplications()] : []),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, isRefreshing, refetchApplications, refetchInterviewPosts]);

  const enableNearbyFilter = async (radiusM: NearbyRadiusM) => {
    setIsRequestingLocation(true);
    setPendingLocationRadiusM(radiusM);
    setLocationMessage(null);

    try {
      const existingPermission = await Location.getForegroundPermissionsAsync();
      let permissionStatus = existingPermission.status;

      if (
        permissionStatus === Location.PermissionStatus.DENIED &&
        !existingPermission.canAskAgain
      ) {
        setLocationFilter("all");
        setLocationMessage("위치 권한을 허용하면 거리 기준으로 볼 수 있어요.");
        return;
      }

      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        const requestedPermission =
          await Location.requestForegroundPermissionsAsync();
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
      setNearbyCenter({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      });
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
    <SafeAreaView
      className="flex-1 bg-hypo-bg"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1 gap-3 px-4 pt-3">
        <View className="min-h-[34px] flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 pl-1">
            <Text className="text-[24px] font-bold leading-[31px] text-hypo-text">
              공고
            </Text>
            <Text className="mt-0.5 text-[13px] leading-[19px] text-hypo-muted">
              목적에 맞는 참여 기회를 찾아보세요
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="내 활동 보기"
              accessibilityRole="button"
              hitSlop={12}
              className="h-10 shrink-0 flex-row items-center justify-center gap-1.5 rounded-[11px] border border-hypo-border/80 bg-hypo-surface px-3"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/interviews/my-interviews",
                  params: { returnTo: "/(tabs)/interviews" },
                })
              }
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              })}
            >
              <Feather color={colors.textMuted} name="folder" size={14} />
              <Text className="text-[13px] font-semibold text-hypo-muted">
                내 활동
              </Text>
            </Pressable>
            {canCreateAndManagePosts ? (
              <Pressable
                accessibilityLabel="공고 만들기"
                accessibilityRole="button"
                hitSlop={12}
                className="h-10 shrink-0 flex-row items-center justify-center gap-1.5 rounded-[11px] bg-hypo-brand px-3"
                onPress={handleCreatePress}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <Feather color="#FFFFFF" name="plus" size={14} />
                <Text className="text-[13px] font-semibold text-white">
                  만들기
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="min-h-0 flex-1">
          <View className="flex-row items-center gap-2">
            <SearchField
              accessibilityLabel="공고 검색"
              containerClassName="h-12 flex-1"
              placeholder="공고, 관심 분야, 지역 검색"
              returnKeyType="search"
              value={query}
              onChangeText={setQuery}
            />
            <Pressable
              accessibilityLabel={
                activeFilterCount
                  ? `필터 ${activeFilterCount}개 적용됨`
                  : "공고 필터"
              }
              accessibilityRole="button"
              className="h-12 flex-row items-center justify-center gap-1.5 rounded-[11px] border border-hypo-border bg-hypo-surface px-3"
              hitSlop={8}
              onPress={() => setIsFilterOpen(true)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              })}
            >
              <Feather color={colors.textMuted} name="sliders" size={17} />
              <Text className="text-[13px] font-semibold text-hypo-text">
                필터
              </Text>
              {activeFilterCount ? (
                <View className="h-5 min-w-5 items-center justify-center rounded-full bg-hypo-brandSoft">
                  <Text className="text-[11px] font-semibold text-hypo-brand">
                    {activeFilterCount}
                  </Text>
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
                  <ActiveChip
                    label={interviewModeLabels[modeFilter]}
                    onPress={() => setModeFilter("all")}
                  />
                ) : null}
                {rewardFilter !== "all" ? (
                  <ActiveChip
                    label={
                      rewardFilters.find(
                        (filter) => filter.value === rewardFilter,
                      )?.label ?? "현금 보상"
                    }
                    onPress={() => setRewardFilter("all")}
                  />
                ) : null}
                {locationFilter !== "all" ? (
                  <ActiveChip
                    label={formatRadius(locationFilter)}
                    onPress={() => setLocationFilter("all")}
                  />
                ) : null}
                <View className="rounded-full bg-hypo-bg px-2.5 py-1">
                  <Text className="text-[11px] font-semibold leading-4 text-hypo-muted">
                    {filteredPosts.length}개
                  </Text>
                </View>
              </ScrollView>
            </View>
          ) : null}
          {locationMessage ? (
            <Text className="mt-1 rounded-xl bg-hypo-bg px-3 py-2 text-[11px] font-bold leading-4 text-hypo-muted">
              {locationMessage}
            </Text>
          ) : null}

          <ListSection
            chrome="plain"
            className="mt-3 min-h-0 flex-1"
            surface="background"
          >
            <ScrollView
              contentContainerStyle={
                hasFilteredPosts
                  ? { paddingBottom: listBottomInset }
                  : { flexGrow: 1, paddingBottom: listBottomInset }
              }
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
              {isLoading ? <PostingListSkeleton /> : null}
              {isError ? (
                <PostingListError
                  onRetry={() => void refreshInterviewSearch()}
                />
              ) : null}
              {!isLoading && !isError && filteredPosts.length === 0 ? (
                <InterviewEmptyState
                  hasFilterOrQuery={Boolean(activeFilterCount || query.trim())}
                  onClear={() => {
                    setQuery("");
                    clearFilters();
                  }}
                />
              ) : null}

              {hasFilteredPosts
                ? filteredPosts.map((post) => (
                    <PostingDiscoveryRow
                      key={post.id}
                      existingApplication={
                        applicationByPostId.get(post.id) ?? null
                      }
                      isRead={Boolean(
                        applicationByPostId.has(post.id) ||
                        viewedPostIds.has(post.id),
                      )}
                      post={post}
                      onPress={() => {
                        if (accessToken) {
                          markPostViewed.mutate({
                            postId: post.id,
                            source: "interviews",
                          });
                        }
                        router.push({
                          pathname: "/interviews/[postId]",
                          params: {
                            postId: post.id,
                            returnTo: "/(tabs)/interviews",
                          },
                        });
                      }}
                    />
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

function InterviewEmptyState({
  hasFilterOrQuery,
  onClear,
}: {
  hasFilterOrQuery: boolean;
  onClear: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-hypo-brandSoft">
        <Feather color="#176B5D" name="search" size={20} />
      </View>
      <Text className="mt-4 text-center text-[15px] font-semibold leading-6 text-hypo-text">
        {hasFilterOrQuery
          ? "조건에 맞는 공고가 없어요"
          : "아직 열린 공고가 없어요"}
      </Text>
      <Text className="mt-1 text-center text-xs leading-[19px] text-hypo-muted">
        {hasFilterOrQuery
          ? "필터를 조정하거나 다른 검색어를 입력해 보세요."
          : "새 공고가 올라오면 여기에서 바로 볼 수 있어요."}
      </Text>
      {hasFilterOrQuery ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-10 items-center justify-center rounded-[11px] border border-hypo-border bg-hypo-surface px-4"
          onPress={onClear}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <Text className="text-xs font-semibold text-hypo-text">
            검색 조건 지우기
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PostingListSkeleton() {
  return (
    <View
      accessibilityLabel="공고를 불러오는 중"
      accessibilityRole="progressbar"
    >
      {[0, 1, 2].map((index) => (
        <View key={index} className="border-b border-hypo-border px-3.5 py-4">
          <View className="h-4 w-24 rounded-full bg-hypo-surfaceMuted" />
          <View className="mt-2 h-5 w-4/5 rounded bg-hypo-surfaceMuted" />
          <View className="mt-2 h-4 w-full rounded bg-hypo-surfaceMuted" />
          <View className="mt-2 h-4 w-3/5 rounded bg-hypo-surfaceMuted" />
        </View>
      ))}
    </View>
  );
}

function PostingListError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-center text-[15px] font-semibold text-hypo-text">
        공고를 불러오지 못했어요.
      </Text>
      <Text className="mt-1 text-center text-xs leading-[19px] text-hypo-muted">
        잠시 후 다시 시도해 주세요.
      </Text>
      <Pressable
        accessibilityLabel="공고 다시 불러오기"
        accessibilityRole="button"
        className="mt-4 min-h-10 items-center justify-center rounded-[11px] border border-hypo-border bg-hypo-surface px-4"
        onPress={onRetry}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        })}
      >
        <Text className="text-[13px] font-semibold text-hypo-text">
          다시 시도
        </Text>
      </Pressable>
    </View>
  );
}

function ActiveChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} 필터 해제`}
      accessibilityRole="button"
      className="rounded-full bg-hypo-brandSoft px-3 py-1"
      onPress={onPress}
    >
      <Text className="text-xs font-medium leading-4 text-hypo-brand">
        {label} ×
      </Text>
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
    <Modal
      animationType="slide"
      transparent
      visible={isOpen}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          accessibilityLabel="필터 닫기"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          className="rounded-t-[22px] bg-hypo-surface px-5 pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom + 20, 28) }}
        >
          <View className="mb-3 self-center h-1 w-[42px] rounded-full bg-hypo-border" />
          <View className="flex-row justify-between gap-4">
            <View>
              <Text className="text-[22px] font-bold leading-7 text-hypo-text">
                필터
              </Text>
              <Text className="mt-1 text-[13px] leading-[19px] text-hypo-muted">
                조건을 골라 맞는 공고만 볼 수 있어요.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Text className="text-[13px] font-semibold text-hypo-muted">
                닫기
              </Text>
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

          <FilterGroup label="현금 보상">
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
                label={
                  isRequestingLocation &&
                  pendingLocationRadiusM === option.value
                    ? "위치 확인 중"
                    : option.label
                }
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
              <Text className="text-[15px] font-semibold text-hypo-text">
                초기화
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="min-h-[52px] flex-1 items-center justify-center rounded-[14px] bg-hypo-brand"
              onPress={onClose}
            >
              <Text className="text-[15px] font-semibold text-white">
                결과 보기
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View className="mt-[22px] gap-2">
      <Text className="text-xs font-semibold text-hypo-muted">{label}</Text>
      <ScrollView
        horizontal
        contentContainerClassName="gap-2 pr-4"
        showsHorizontalScrollIndicator={false}
      >
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
        isSelected
          ? "border-hypo-brand bg-hypo-brandSoft"
          : "border-hypo-border bg-hypo-surface"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-[13px] font-medium ${isSelected ? "text-hypo-brand" : "text-hypo-muted"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
