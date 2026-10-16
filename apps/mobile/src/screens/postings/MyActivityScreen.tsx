import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { usePostings } from "@/features/postings/usePostings";
import { useSessions } from "@/features/sessions/useSessions";
import { buildApplicationReadModels, type ApplicationReadModel } from "@/features/applications/applicationReadModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/shared/ui/StateMessage";
import {
  getPostingCompensationLabel,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/features/postings/postingPresentation";
import { resolveReturnTo } from "@/shared/navigation/backNavigation";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";
import { ActivityHeader, StatusTag } from "./ActivityComponents";
import { getApplicationDisplayStatus, getPostStatusDisplay } from "./activityStatus";

type MyInterviewTab = "applications" | "posts";

export function MyActivityScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[]; tab?: MyInterviewTab | MyInterviewTab[] }>();
  const pathname = usePathname();
  const isHomeActivityRoute = pathname.startsWith("/home/");
  const activityRoot = isHomeActivityRoute ? "/(tabs)/home/my-interviews" : "/(tabs)/interviews/my-interviews";
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews");
  const { accessToken, appUser } = useAuth();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const [activeTab, setActiveTab] = useState<MyInterviewTab>(requestedTab === "posts" ? "posts" : "applications");
  const activityReturnTo = `${activityRoot}?tab=${activeTab}&returnTo=${encodeURIComponent(String(backTo))}`;

  useEffect(() => {
    if (requestedTab === "applications" || requestedTab === "posts") {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = usePostings(undefined, accessToken);
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
  const myPostings = useMemo(
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
          <ActivityHeader backTo={backTo} />
          <StateMessage title="로그인이 필요해요." description="신청한 공고와 내 공고의 진행 상태는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <ActivityHeader backTo={backTo} />

        <View className="mb-3 mt-2 flex-row rounded-[12px] bg-hypo-surface p-1">
          <SegmentButton
            count={myApplicationRows.length}
            isActive={activeTab === "applications"}
            label="내 참여"
            onPress={() => setActiveTab("applications")}
          />
          <SegmentButton
            count={myPostings.length}
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
              myPostings.length ? (
                <ListSection chrome="plain" surface="background">
                  {myPostings.map((post) => (
                    <OwnedPostingRow
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

function OwnedPostingRow({
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
