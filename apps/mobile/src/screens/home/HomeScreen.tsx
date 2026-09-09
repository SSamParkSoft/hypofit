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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplications } from "@/features/applications/useApplications";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "@/features/interview-posts/useInterviewPosts";
import { PostingDiscoveryRow } from "@/features/interview-posts/PostingDiscoveryRow";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  findUnseenImportantNotice,
  markImportantNoticeSeen,
  type PublishedNotice,
} from "@/features/notices/importantNotice";
import type { Application } from "@hypofit/contracts";
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
  const [importantNotice, setImportantNotice] = useState<PublishedNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const myApplications = useMemo(
    () => (appUser ? applications.filter((application) => application.respondent_id === appUser.id) : []),
    [appUser, applications],
  );
  const selectedApplicationCount = useMemo(
    () => myApplications.filter((application) => application.status === "selected").length,
    [myApplications],
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
  const pendingApplications = useMemo(
    () =>
      applications.filter(
        (application) => ownOpenPostIds.has(application.interview_post_id) && application.status === "applied",
      ),
    [applications, ownOpenPostIds],
  );
  const pendingApplicantCount = pendingApplications.length;
  const pendingApplicantPostLabel = useMemo(() => {
    const titles = Array.from(
      new Set(
        pendingApplications
          .map((application) => interviewPosts.find((post) => post.id === application.interview_post_id)?.title)
          .filter((title): title is string => Boolean(title)),
      ),
    );

    if (!titles.length) {
      return "내 공고에 새로운 지원자가 들어왔어요.";
    }

    return titles.length > 1 ? `${titles[0]} 외 ${titles.length - 1}개 공고` : titles[0];
  }, [interviewPosts, pendingApplications]);
  const ownOpenPostCount = ownOpenPostIds.size;
  const recentPosts = useMemo(
    () =>
      interviewPosts.filter(
        (post) => post.founder_id !== appUser?.id && !myApplications.some((application) => application.interview_post_id === post.id),
      ),
    [appUser?.id, interviewPosts, myApplications],
  );
  const hasRecentPosts = !isLoading && !isError && recentPosts.length > 0;
  const greeting = appUser?.name?.trim() ? `${appUser.name.trim()}님, 안녕하세요` : "안녕하세요";
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );
  const applicationByPostId = useMemo(
    () =>
      new Map(
        myApplications.map((application) => [
          application.interview_post_id,
          application,
        ]),
      ),
    [myApplications],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const memberId = appUser?.id;
      if (!memberId) {
        setImportantNotice(null);
        return () => {
          active = false;
        };
      }

      void findUnseenImportantNotice(memberId)
        .then((notice) => {
          if (active) {
            setImportantNotice(notice);
          }
        })
        .catch(() => {
          // A non-critical notice check must not block the home screen.
        });

      return () => {
        active = false;
      };
    }, [appUser?.id]),
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
            <Text className="text-[26px] font-bold leading-[34px] text-hypo-text">{greeting}</Text>
            <Text className="mt-1 text-[14px] leading-5 text-hypo-muted">오늘의 참여와 모집 현황이에요.</Text>
          </View>

          <HomeActionSection
            pendingApplicantCount={pendingApplicantCount}
            pendingApplications={pendingApplications}
            pendingApplicantPostLabel={pendingApplicantPostLabel}
            ownOpenPostCount={ownOpenPostCount}
            selectedApplicationCount={selectedApplicationCount}
          />

          <View className="mt-8">
            <View className="flex-row items-center justify-between gap-3 px-1">
              <Text className="min-w-0 flex-1 text-[19px] font-bold leading-[26px] text-hypo-text">새로 올라온 공고</Text>
              <Pressable
                accessibilityLabel="공고 탭으로 이동"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push("/(tabs)/interviews")}
              >
                <Text className="text-[13px] font-semibold text-hypo-brand">더 보기</Text>
              </Pressable>
            </View>

            <View className="mt-3">
              {isLoading ? <StateMessage title="공고를 불러오는 중이에요." loading /> : null}
              {isError ? <StateMessage title="공고를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." /> : null}
              {!isLoading && !isError && recentPosts.length === 0 ? (
                <StateMessage title="아직 열린 공고가 없어요." description="새 공고가 올라오면 여기에서 바로 볼 수 있어요." />
              ) : null}
              {hasRecentPosts ? (
                <View className="overflow-hidden rounded-[20px] border border-hypo-border bg-hypo-surface">
                  {recentPosts.slice(0, 3).map((post, index, posts) => (
                    <PostingDiscoveryRow
                      existingApplication={applicationByPostId.get(post.id) ?? null}
                      isLast={index === posts.length - 1}
                      key={post.id}
                      isRead={viewedPostIds.has(post.id)}
                      post={post}
                      onPress={() => openPost(post.id)}
                    />
                  ))}
                </View>
              ) : null}
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
      <ImportantNoticeModal
        notice={importantNotice}
        visible={Boolean(importantNotice) && !isWelcomeOpen}
        onClose={() => {
          if (!importantNotice || !appUser) return;
          setImportantNotice(null);
          void markImportantNoticeSeen(appUser.id, importantNotice.id);
        }}
        onOpenNotice={() => {
          if (!importantNotice || !appUser) return;
          const noticeId = importantNotice.id;
          setImportantNotice(null);
          void markImportantNoticeSeen(appUser.id, noticeId);
          router.push({ pathname: "/notice", params: { returnTo: "/(tabs)/home" } });
        }}
      />
    </SafeAreaView>
  );
}

function HomeActionSection({
  pendingApplicantCount,
  pendingApplications,
  pendingApplicantPostLabel,
  ownOpenPostCount,
  selectedApplicationCount,
}: {
  pendingApplicantCount: number;
  pendingApplications: Application[];
  pendingApplicantPostLabel: string;
  ownOpenPostCount: number;
  selectedApplicationCount: number;
}) {
  const activities: HomeActivity[] = [
    pendingApplicantCount
      ? {
          action: "검토하기",
          applicants: pendingApplications,
          description: pendingApplicantPostLabel,
          icon: "users",
          kind: "applicants",
          label: `새 신청 ${pendingApplicantCount}건`,
        }
      : null,
    selectedApplicationCount
      ? {
          action: "참여 이어가기",
          description: "선정된 공고의 다음 단계를 이어가세요.",
          icon: "check-circle",
          kind: "participation",
          label: `참여 예정 공고 ${selectedApplicationCount}건`,
        }
      : null,
    ownOpenPostCount
      ? {
          action: "공고 관리하기",
          description: "모집 중인 공고의 참여 현황을 살펴보세요.",
          icon: "file-text",
          kind: "posts",
          label: `모집 중인 공고 ${ownOpenPostCount}건`,
        }
      : null,
  ].filter((activity): activity is HomeActivity => activity !== null);
  const [primaryActivity] = activities;

  if (!primaryActivity) {
    return null;
  }

  const openActivity = (kind: HomeActivity["kind"]) => {
    router.push({
      pathname: "/(tabs)/home/my-interviews",
      params: {
        tab: kind === "participation" ? "applications" : "posts",
      },
    });
  };

  return (
    <View className="mt-7">
      <Text className="px-1 text-[19px] font-bold leading-[26px] text-hypo-text">지금 확인할 일</Text>
      <Pressable
        accessibilityHint={primaryActivity.action}
        accessibilityLabel={`${primaryActivity.label}. ${primaryActivity.description}`}
        accessibilityRole="button"
        className="mt-3 rounded-[20px] border border-hypo-border bg-hypo-surface px-5 py-4"
        onPress={() => openActivity(primaryActivity.kind)}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}
      >
        <View className="flex-row items-center gap-3">
          {primaryActivity.applicants?.length ? (
            <ApplicantAvatarStack applications={primaryActivity.applicants} />
          ) : (
            <View className="h-7 w-7 items-center justify-center">
              <Feather color={colors.brand} name={primaryActivity.icon} size={22} />
            </View>
          )}
          <View className="min-w-0 flex-1 py-0.5">
            <Text className="text-[17px] font-semibold leading-6 text-hypo-text">{primaryActivity.label}</Text>
            <Text numberOfLines={1} className="mt-0.5 text-[14px] leading-5 text-hypo-text-secondary">{primaryActivity.description}</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <Text className="text-[14px] font-semibold leading-5 text-hypo-brand">{primaryActivity.action}</Text>
              <Feather color={colors.brand} name="arrow-right" size={16} />
            </View>
          </View>
        </View>
      </Pressable>

      <View className="mt-3 flex-row px-1">
        <ActivitySummary
          label="내 참여"
          onPress={() => openActivity("participation")}
          value={`예정 ${selectedApplicationCount}건`}
        />
        <ActivitySummary
          label="내 공고"
          onPress={() => openActivity("posts")}
          value={`모집 중 ${ownOpenPostCount}건`}
        />
      </View>
    </View>
  );
}

type HomeActivity = {
  action: string;
  applicants?: Application[];
  description: string;
  icon: keyof typeof Feather.glyphMap;
  kind: "applicants" | "participation" | "posts";
  label: string;
};

function ActivitySummary({ label, onPress, value }: { label: string; onPress: () => void; value: string }) {
  return (
    <Pressable
      accessibilityLabel={`${label} ${value} 보기`}
      accessibilityRole="button"
      className={`min-h-11 flex-1 justify-center ${label === "내 공고" ? "border-l border-hypo-border pl-4" : "pr-4"}`}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceMuted : "transparent" })}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[12px] font-medium leading-[17px] text-hypo-text-metadata">{label}</Text>
        <Feather color={colors.textMuted} name="chevron-right" size={16} />
      </View>
      <Text className="mt-0.5 text-[16px] font-semibold leading-[22px] text-hypo-text">{value}</Text>
    </Pressable>
  );
}

function ApplicantAvatarStack({ applications }: { applications: Application[] }) {
  return (
    <View accessibilityElementsHidden className="h-10 w-10 items-center justify-center rounded-full border border-hypo-border bg-hypo-brandSoft">
      <Feather color="#176B5D" name="users" size={20} />
      {applications.length > 0 ? <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-hypo-surface bg-hypo-brand" /> : null}
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

function ImportantNoticeModal({
  notice,
  onClose,
  onOpenNotice,
  visible,
}: {
  notice: PublishedNotice | null;
  onClose: () => void;
  onOpenNotice: () => void;
  visible: boolean;
}) {
  if (!notice) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/40 px-5">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="w-full max-w-[380px] self-center rounded-[24px] bg-hypo-surface px-6 py-6">
          <View className="flex-row items-center gap-2">
            <Feather accessibilityElementsHidden color={colors.brand} name="alert-circle" size={18} />
            <Text className="text-[14px] font-semibold text-hypo-brand">중요 안내</Text>
          </View>
          <Text numberOfLines={2} className="mt-5 text-[22px] font-bold leading-[30px] text-hypo-text">
            {notice.title}
          </Text>
          <Text numberOfLines={3} className="mt-2 text-[15px] leading-6 text-hypo-text-secondary">
            {notice.body}
          </Text>
          <View className="mt-6">
            <PrimaryButton onPress={onOpenNotice}>공지 확인하기</PrimaryButton>
            <Pressable
              accessibilityLabel="중요 공지 나중에 보기"
              accessibilityRole="button"
              className="mt-2 min-h-[44px] items-center justify-center"
              onPress={onClose}
            >
              <Text className="text-[15px] font-semibold text-hypo-text-secondary">나중에</Text>
            </Pressable>
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
