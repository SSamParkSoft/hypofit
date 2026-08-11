import { useEffect, useMemo, useState } from "react";

import { useCreateApplication } from "../features/applications/useApplicationMutations";
import { useApplications } from "../features/applications/useApplications";
import { useAuth } from "../features/auth/useAuth";
import { InterviewResultsList } from "../features/interview-posts/components/InterviewResultsList";
import { InterviewSearchToolbar } from "../features/interview-posts/components/InterviewSearchToolbar";
import { OpportunityDetailPanel } from "../features/interview-posts/components/OpportunityDetailPanel";
import {
  buildInterviewsSearchParams,
  filterInterviewPosts,
  readInterviewsSearchStateFromUrl,
  type ModeFilter,
  type NearbyStatus,
  type RewardFilter,
} from "../features/interview-posts/model/interviewsSearch";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "../features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "../features/interview-posts/useInterviewPosts";
import type { AppUser } from "../shared/api/types";
import { canUseFounderTools } from "../shared/auth/roles";
import { navigateTo, replacePath } from "../shared/navigation/appNavigation";
import { Button } from "../shared/ui/button";
import { PageHeader, PageLayout } from "../shared/ui/page";
import { ContextPanel, SplitView } from "../shared/ui/workspace";

interface InterviewsPageProps {
  appUser: AppUser | null;
}

export function InterviewsPage({ appUser }: InterviewsPageProps) {
  const { accessToken } = useAuth();
  const initialSearchState = useMemo(readInterviewsSearchStateFromUrl, []);
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>(
    initialSearchState.nearbyCenter ? "granted" : "idle",
  );
  const [nearbyCenter, setNearbyCenter] = useState<{ lat: number; lng: number } | null>(
    initialSearchState.nearbyCenter,
  );
  const [nearbyRadiusM, setNearbyRadiusM] = useState(initialSearchState.nearbyRadiusM);
  const interviewPostParams = useMemo(
    () =>
      nearbyCenter
        ? {
            status: "open" as const,
            lat: nearbyCenter.lat,
            lng: nearbyCenter.lng,
            radiusM: nearbyRadiusM,
            sort: "distance" as const,
          }
        : { status: "open" as const },
    [nearbyCenter, nearbyRadiusM],
  );
  const { data: posts = [], isError, isLoading } = useInterviewPosts(interviewPostParams);
  const { data: applications = [] } = useApplications(accessToken);
  const { data: postViews = [] } = useInterviewPostViews(accessToken);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(
    initialSearchState.selectedPostId,
  );
  const [query, setQuery] = useState(initialSearchState.query);
  const [modeFilter, setModeFilter] = useState<ModeFilter>(initialSearchState.modeFilter);
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>(initialSearchState.rewardFilter);
  const canCreateAndManagePosts = canUseFounderTools(appUser?.role);
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

  const filteredPosts = useMemo(
    () => filterInterviewPosts(posts, { modeFilter, query, rewardFilter }),
    [modeFilter, posts, query, rewardFilter],
  );

  const requestNearbyLocation = () => {
    if (!navigator.geolocation) {
      setNearbyStatus("unavailable");
      return;
    }

    setNearbyStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearbyStatus("granted");
        setNearbyCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        setNearbyStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setNearbyCenter(null);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  };

  const selectedPost =
    filteredPosts.find((post) => post.id === selectedPostId) ?? filteredPosts[0] ?? null;

  useEffect(() => {
    const handlePopState = () => {
      const nextState = readInterviewsSearchStateFromUrl();
      setQuery(nextState.query);
      setModeFilter(nextState.modeFilter);
      setRewardFilter(nextState.rewardFilter);
      setSelectedPostId(nextState.selectedPostId);
      setNearbyCenter(nextState.nearbyCenter);
      setNearbyRadiusM(nextState.nearbyRadiusM);
      setNearbyStatus(nextState.nearbyCenter ? "granted" : "idle");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const nextSearch = buildInterviewsSearchParams({
      modeFilter,
      nearbyCenter,
      nearbyRadiusM,
      query,
      rewardFilter,
      selectedPostId,
    }).toString();
    const nextUrl = nextSearch ? `/interviews?${nextSearch}` : "/interviews";
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      replacePath(nextUrl, { focus: "none", intent: "state", scroll: "preserve" });
    }
  }, [modeFilter, nearbyCenter, nearbyRadiusM, query, rewardFilter, selectedPostId]);

  useEffect(() => {
    if (selectedPostId && !filteredPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(null);
    }
  }, [filteredPosts, selectedPostId]);

  return (
    <PageLayout
      className="min-h-[var(--app-mobile-content-height)] gap-4 min-[1200px]:h-dvh min-[1200px]:grid-rows-[auto_auto_minmax(0,1fr)] min-[1200px]:overflow-hidden"
      variant="list-detail"
    >
      <PageHeader
        description="검색과 필터를 조정하면서 조건이 맞는 인터뷰를 바로 비교하고 신청할 수 있어요."
        title="인터뷰"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigateTo("/my-interviews")}>
              내 인터뷰
            </Button>
            {canCreateAndManagePosts ? (
              <Button size="sm" variant="tonal" onClick={() => navigateTo("/interviews/new")}>
                모집글 만들기
              </Button>
            ) : null}
          </div>
        }
      />

      <InterviewSearchToolbar
        isNearbyEnabled={Boolean(nearbyCenter)}
        modeFilter={modeFilter}
        nearbyRadiusM={nearbyRadiusM}
        nearbyStatus={nearbyStatus}
        query={query}
        resultCount={filteredPosts.length}
        rewardFilter={rewardFilter}
        onClearFilters={() => {
          setModeFilter("all");
          setRewardFilter("all");
          setNearbyCenter(null);
          setNearbyStatus("idle");
        }}
        onModeChange={setModeFilter}
        onNearbyDisable={() => {
          setNearbyCenter(null);
          setNearbyStatus("idle");
        }}
        onNearbyEnable={requestNearbyLocation}
        onNearbyRadiusChange={setNearbyRadiusM}
        onQueryChange={setQuery}
        onRewardChange={setRewardFilter}
      />

      <SplitView
        className="min-h-0"
        detail={
          <ContextPanel className="border-0 bg-transparent shadow-none">
            <OpportunityDetailPanel
              canApply={Boolean(accessToken)}
              errorMessage={
                createApplication.error instanceof Error ? createApplication.error.message : null
              }
              isApplying={createApplication.isPending}
              existingApplication={
                selectedPost ? applicationByPostId.get(selectedPost.id) ?? null : null
              }
              post={selectedPost}
              onApply={(input) => {
                createApplication.mutate(input);
              }}
            />
          </ContextPanel>
        }
        list={
          <InterviewResultsList
            activePostId={selectedPost?.id ?? null}
            applicationByPostId={applicationByPostId}
            canApply={Boolean(accessToken)}
            errorMessage={
              createApplication.error instanceof Error ? createApplication.error.message : null
            }
            filteredPosts={filteredPosts}
            isApplying={createApplication.isPending}
            isError={isError}
            isLoading={isLoading}
            selectedPostId={selectedPostId}
            viewedPostIds={viewedPostIds}
            onApply={(input) => {
              createApplication.mutate(input);
            }}
            onSelect={(postId) => {
              if (accessToken) {
                markPostViewed.mutate({ postId, source: "interviews" });
              }
              setSelectedPostId(postId === selectedPostId ? null : postId);
            }}
          />
        }
      />
    </PageLayout>
  );
}
