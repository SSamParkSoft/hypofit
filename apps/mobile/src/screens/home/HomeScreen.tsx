import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplications } from "@/features/applications/useApplications";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { PostingDiscoveryRow } from "@/features/interview-posts/PostingDiscoveryRow";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors } from "@/shared/theme/tokens";
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
  const markPostViewed = useMarkInterviewPostViewed(accessToken);
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
  const hasRecentInterviews = !isLoading && !isError && interviewPosts.length > 0;
  const greeting = appUser?.name?.trim() ? `${appUser.name.trim()}님, 안녕하세요` : "안녕하세요";
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
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

  const openPost = (postId: string) => {
    if (accessToken) {
      markPostViewed.mutate({ postId, source: "home" });
    }
    router.push({ pathname: "/interviews/[postId]", params: { postId, returnTo: "/(tabs)/home" } });
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
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-row items-center gap-2.5">
            <Image
              accessibilityIgnoresInvertColors
              className="h-[32px] w-[32px]"
              resizeMode="contain"
              source={require("../../../assets/hypofit-mark.png")}
            />
            <Text className="text-[18px] font-bold text-hypo-text">Hypofit</Text>
          </View>
          <NotificationButton returnTo="/(tabs)/home" />
        </View>

        <ScrollView
          className="mt-5"
          contentContainerClassName="pb-24"
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
          <View className="px-1">
            <Text className="text-[24px] font-bold leading-[32px] text-hypo-text">{greeting}</Text>
            <Text className="mt-1 text-[14px] leading-5 text-hypo-muted">지금 필요한 공고와 진행 상황을 확인하세요.</Text>
          </View>

          <HomeActionSection
            applicantCount={applicantCount}
            ownOpenPostCount={ownOpenPostCount}
            selectedApplicationCount={selectedApplicationCount}
          />

          <View className="mt-8">
            <View className="flex-row items-end justify-between gap-3 px-1">
              <View className="min-w-0 flex-1">
                <Text className="text-[21px] font-bold leading-7 text-hypo-text">새로 올라온 공고</Text>
                <Text className="mt-0.5 text-[13px] leading-[19px] text-hypo-muted">관심 있는 공고를 눌러 조건을 확인해 보세요.</Text>
              </View>
              <Pressable
                accessibilityLabel="공고 탭으로 이동"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push("/(tabs)/interviews")}
              >
                <Text className="text-[13px] font-semibold text-hypo-brand">전체 보기</Text>
              </Pressable>
            </View>

            <View className="mt-3">
              {isLoading ? <StateMessage title="공고를 불러오는 중이에요." loading /> : null}
              {isError ? <StateMessage title="공고를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." /> : null}
              {!isLoading && !isError && interviewPosts.length === 0 ? (
                <StateMessage title="아직 열린 공고가 없어요." description="새 공고가 올라오면 여기에서 바로 볼 수 있어요." />
              ) : null}
              {hasRecentInterviews
                ? interviewPosts.slice(0, 4).map((post) => (
                    <PostingDiscoveryRow
                      existingApplication={applicationByPostId.get(post.id) ?? null}
                      key={post.id}
                      isRead={viewedPostIds.has(post.id)}
                      post={post}
                      onPress={() => openPost(post.id)}
                    />
                  ))
                : null}
            </View>
          </View>
        </ScrollView>
      </View>
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

function HomeActionSection({
  applicantCount,
  ownOpenPostCount,
  selectedApplicationCount,
}: {
  applicantCount: number;
  ownOpenPostCount: number;
  selectedApplicationCount: number;
}) {
  const actions: Array<{ label: string; icon: keyof typeof Feather.glyphMap }> = [
    selectedApplicationCount ? { label: `참여할 공고가 ${selectedApplicationCount}개 있어요`, icon: "check-circle" as const } : null,
    applicantCount ? { label: `확인할 신청이 ${applicantCount}건 있어요`, icon: "users" as const } : null,
    ownOpenPostCount ? { label: `모집 중인 공고가 ${ownOpenPostCount}개 있어요`, icon: "file-text" as const } : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <View className="mt-7">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[17px] font-bold leading-6 text-hypo-text">지금 할 일</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/home" } })}>
          <Text className="text-[13px] font-semibold text-hypo-brand">내 참여</Text>
        </Pressable>
      </View>
      <View className="mt-2 overflow-hidden rounded-[14px] border border-hypo-border bg-hypo-surface">
        {actions.length ? actions.map((action, index) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            className={`min-h-[48px] flex-row items-center gap-3 px-4 ${index ? "border-t border-hypo-border" : ""}`}
            onPress={() => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/home" } })}
          >
            <Feather color={colors.brand} name={action.icon} size={17} />
            <Text className="min-w-0 flex-1 text-[14px] font-medium text-hypo-text">{action.label}</Text>
            <Feather color={colors.textMuted} name="chevron-right" size={17} />
          </Pressable>
        )) : (
          <Pressable
            accessibilityRole="button"
            className="min-h-[48px] flex-row items-center gap-3 px-4"
            onPress={() => router.push("/(tabs)/interviews")}
          >
            <Feather color={colors.brand} name="compass" size={17} />
            <Text className="min-w-0 flex-1 text-[14px] font-medium text-hypo-text">새 공고를 둘러보세요</Text>
            <Feather color={colors.textMuted} name="chevron-right" size={17} />
          </Pressable>
        )}
      </View>
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
            이제 필요한 공고를 확인하고 바로 참여할 수 있어요.
          </Text>
          <View className="mt-5">
            <PrimaryButton onPress={onClose}>홈에서 둘러보기</PrimaryButton>
          </View>
        </View>
      </View>
    </Modal>
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
