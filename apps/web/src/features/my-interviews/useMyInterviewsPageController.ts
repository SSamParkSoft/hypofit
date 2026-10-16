import { useEffect, useMemo, useState } from "react";

import { useUpdateApplicationStatus } from "../applications/useApplicationMutations";
import { useApplications } from "../applications/useApplications";
import { useAuth } from "../auth/useAuth";
import { useInterviewPosts } from "../interview-posts/useInterviewPosts";
import { usePostingDetail } from "../interview-posts/usePostingDetail";
import { useCreateSession } from "../sessions/useSessionMutations";
import { useSessions } from "../sessions/useSessions";
import { buildApplicationReadModels } from "../workflow/readModels";
import type { CreateSessionInput } from "../../shared/api/sessions";
import type { Application, AppUser } from "../../shared/api/types";
import { replacePath } from "../../shared/navigation/appNavigation";
import type { MyInterviewTab, MyInterviewsTabMeta } from "./types";

interface UseMyInterviewsPageControllerOptions {
  appUser: AppUser | null;
}

export function useMyInterviewsPageController({
  appUser,
}: UseMyInterviewsPageControllerOptions) {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<MyInterviewTab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "posts" ? "posts" : "applications",
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("application"),
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("post"),
  );

  const canManageFounderPosts = Boolean(appUser?.id);
  const { data: posts = [], isError: isPostsError, isLoading: isPostsLoading } = useInterviewPosts();
  const requestedPostId = activeTab === "posts" && appUser && selectedPostId &&
    !posts.some((post) => post.id === selectedPostId) ? selectedPostId : null;
  const { data: requestedPost, isLoading: isRequestedPostLoading } = usePostingDetail(requestedPostId);
  const {
    data: applications = [],
    isError: isApplicationsError,
    isLoading: isApplicationsLoading,
  } = useApplications(accessToken);
  const { data: sessions = [], isLoading: isSessionsLoading } = useSessions(accessToken);
  const updateApplicationStatus = useUpdateApplicationStatus(accessToken);
  const createSession = useCreateSession(accessToken);

  const myApplications = useMemo(
    () =>
      appUser
        ? applications.filter((application) => application.respondent_id === appUser.id)
        : [],
    [appUser, applications],
  );

  const myApplicationRows = useMemo(
    () => buildApplicationReadModels({ applications: myApplications, posts, sessions }),
    [myApplications, posts, sessions],
  );

  const myFounderPosts = useMemo(
    () => {
      if (!appUser) return [];
      const ownedPosts = posts.filter((post) => post.founder_id === appUser.id);
      if (requestedPost?.founder_id === appUser.id && !ownedPosts.some((post) => post.id === requestedPost.id)) {
        ownedPosts.unshift(requestedPost);
      }
      return ownedPosts;
    },
    [appUser, posts, requestedPost],
  );

  const applicationsByPostId = useMemo(() => {
    const grouped = new Map<string, Application[]>();

    for (const application of applications) {
      const current = grouped.get(application.interview_post_id);

      if (current) {
        current.push(application);
        continue;
      }

      grouped.set(application.interview_post_id, [application]);
    }

    return grouped;
  }, [applications]);

  const selectedApplicationModel = useMemo(
    () =>
      myApplicationRows.find((model) => model.application.id === selectedApplicationId) ??
      myApplicationRows[0] ??
      null,
    [myApplicationRows, selectedApplicationId],
  );

  const selectedFounderPost = useMemo(
    () => requestedPostId && isRequestedPostLoading ? null :
      myFounderPosts.find((post) => post.id === selectedPostId) ?? myFounderPosts[0] ?? null,
    [isRequestedPostLoading, myFounderPosts, requestedPostId, selectedPostId],
  );

  const tabs = useMemo<MyInterviewsTabMeta[]>(() => {
    const nextTabs: MyInterviewsTabMeta[] = [
      {
        count: myApplicationRows.length,
        description: "신청 상태와 다음 조율 단계를 확인해요.",
        label: "신청한 인터뷰",
        value: "applications",
      },
    ];

    nextTabs.push({
      count: myFounderPosts.length,
      description: "지원자 확인과 선정, 일정 생성을 이어가요.",
      label: "내 모집글",
      value: "posts",
    });

    return nextTabs;
  }, [myApplicationRows.length, myFounderPosts.length]);

  useEffect(() => {
    if (!appUser || !accessToken || isApplicationsLoading) return;
    if (!myApplicationRows.length) {
      setSelectedApplicationId(null);
      return;
    }

    if (
      !selectedApplicationId ||
      !myApplicationRows.some((row) => row.application.id === selectedApplicationId)
    ) {
      setSelectedApplicationId(myApplicationRows[0].application.id);
    }
  }, [accessToken, appUser, isApplicationsLoading, myApplicationRows, selectedApplicationId]);

  useEffect(() => {
    if (!appUser || isPostsLoading || (requestedPostId && isRequestedPostLoading)) return;
    if (!myFounderPosts.length) {
      setSelectedPostId(null);
      return;
    }

    if (!selectedPostId || !myFounderPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(myFounderPosts[0].id);
    }
  }, [appUser, isPostsLoading, isRequestedPostLoading, myFounderPosts, requestedPostId, selectedPostId]);

  return {
    activeTab,
    applicationsByPostId,
    canManageFounderPosts,
    createFounderSession: (input: CreateSessionInput) => {
      createSession.mutate(input);
    },
    createSessionErrorMessage:
      createSession.error instanceof Error ? createSession.error.message : null,
    isCreatingSession: createSession.isPending,
    isError: isPostsError || isApplicationsError,
    isLoading: isPostsLoading || isApplicationsLoading || isSessionsLoading,
    isUpdatingApplication: updateApplicationStatus.isPending,
    myApplicationRows,
    myFounderPosts,
    rejectFounderApplication: (applicationId: string, rejectionReason: string) => {
      updateApplicationStatus.mutate({
        applicationId,
        input: { status: "rejected", rejection_reason: rejectionReason },
      });
    },
    selectApplication: (applicationId: string) => {
      setSelectedApplicationId(applicationId);
      replaceSelectionQuery("applications", applicationId);
    },
    selectFounderApplication: (applicationId: string) => {
      updateApplicationStatus.mutate({
        applicationId,
        input: { status: "selected" },
      });
    },
    selectPost: (postId: string) => {
      setSelectedPostId(postId);
      replaceSelectionQuery("posts", postId);
    },
    selectedApplicationModel,
    selectedFounderPost,
    selectTab: (tab: MyInterviewTab) => {
      setActiveTab(tab);
      replaceSelectionQuery(
        tab,
        (tab === "applications" ? selectedApplicationId : selectedPostId) ?? undefined,
      );
    },
    tabs,
  };
}

function replaceSelectionQuery(tab: MyInterviewTab, selectedId?: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", tab);
  params.delete("application");
  params.delete("post");
  if (selectedId) {
    params.set(tab === "applications" ? "application" : "post", selectedId);
  }
  replacePath(`${window.location.pathname}?${params.toString()}${window.location.hash}`, {
    focus: "none",
    intent: "state",
    scroll: "preserve",
  });
}
