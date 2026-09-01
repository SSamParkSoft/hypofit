import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateSessionInput } from "../../shared/api/sessions";
import type { Application, AppUser, InterviewPost, Session } from "../../shared/api/types";

const mocks = vi.hoisted(() => ({
  authState: {
    accessToken: "token-123",
  },
  createSessionMutation: {
    error: null as Error | null,
    isPending: false,
    mutate: vi.fn(),
  },
  applicationsQuery: {
    data: [] as Application[],
    isError: false,
    isLoading: false,
  },
  postsQuery: {
    data: [] as InterviewPost[],
    isError: false,
    isLoading: false,
  },
  sessionsQuery: {
    data: [] as Session[],
    isLoading: false,
  },
  updateApplicationStatusMutation: {
    isPending: false,
    mutate: vi.fn(),
  },
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../interview-posts/useInterviewPosts", () => ({
  useInterviewPosts: () => mocks.postsQuery,
}));

vi.mock("../applications/useApplications", () => ({
  useApplications: () => mocks.applicationsQuery,
}));

vi.mock("../sessions/useSessions", () => ({
  useSessions: () => mocks.sessionsQuery,
}));

vi.mock("../applications/useApplicationMutations", () => ({
  useUpdateApplicationStatus: () => mocks.updateApplicationStatusMutation,
}));

vi.mock("../sessions/useSessionMutations", () => ({
  useCreateSession: () => mocks.createSessionMutation,
}));

import { useMyInterviewsPageController } from "./useMyInterviewsPageController";

const founderUser: AppUser = {
  bio: null,
  email: "founder@example.com",
  id: "founder-1",
  name: "창업자",
  organization_name: null,
  organization_type: null,
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "both",
};

const respondentUser: AppUser = {
  bio: null,
  email: "respondent@example.com",
  id: "respondent-1",
  name: "인터뷰어",
  organization_name: null,
  organization_type: null,
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "respondent",
};

const basePost: InterviewPost = {
  distance_meters: null,
  duration_minutes: 45,
  founder: {
    bio: null,
    id: founderUser.id,
    name: founderUser.name,
    profile_image_url: null,
    role: founderUser.role,
  },
  founder_id: founderUser.id,
  founder_review_summary: null,
  id: "post-1",
  interview_mode: "online",
  location: null,
  location_address: null,
  location_latitude: null,
  location_longitude: null,
  location_place_name: null,
  location_precision: null,
  location_source: null,
  location_text: null,
  recruit_count: 3,
  reward_amount: 50000,
  schedule_options: [],
  service_summary: "서비스 요약",
  status: "open",
  target_description: "가설 검증이 필요한 초기 창업자",
  title: "초기 창업자 인터뷰",
};

const secondPost: InterviewPost = {
  ...basePost,
  id: "post-2",
  title: "두 번째 인터뷰",
};

const baseApplication: Application = {
  answers: { relevant_experience: "테스트 경험이 있습니다." },
  available_times: ["2026-07-20T10:00:00+09:00"],
  id: "application-1",
  interview_post_id: basePost.id,
  rejection_reason: null,
  respondent: {
    bio: null,
    id: respondentUser.id,
    name: respondentUser.name,
    profile_image_url: null,
    role: respondentUser.role,
  },
  respondent_id: respondentUser.id,
  status: "applied",
};

const secondApplication: Application = {
  ...baseApplication,
  id: "application-2",
  interview_post_id: secondPost.id,
};

const baseSession: Session = {
  application: null,
  application_id: secondApplication.id,
  id: "session-1",
  meeting_type: "online",
  meeting_url: "https://example.com/meeting",
  place: null,
  scheduled_at: "2026-07-22T14:00:00+09:00",
  status: "scheduled",
};

describe("useMyInterviewsPageController", () => {
  beforeEach(() => {
    mocks.authState.accessToken = "token-123";
    mocks.postsQuery.data = [basePost, secondPost];
    mocks.postsQuery.isError = false;
    mocks.postsQuery.isLoading = false;
    mocks.applicationsQuery.data = [baseApplication, secondApplication];
    mocks.applicationsQuery.isError = false;
    mocks.applicationsQuery.isLoading = false;
    mocks.sessionsQuery.data = [baseSession];
    mocks.sessionsQuery.isLoading = false;
    mocks.updateApplicationStatusMutation.isPending = false;
    mocks.updateApplicationStatusMutation.mutate.mockReset();
    mocks.createSessionMutation.error = null;
    mocks.createSessionMutation.isPending = false;
    mocks.createSessionMutation.mutate.mockReset();
  });

  it("restores the selected application to the first remaining row when the previous selection disappears", async () => {
    const { result, rerender } = renderHook(
      ({ appUser }: { appUser: AppUser | null }) => useMyInterviewsPageController({ appUser }),
      {
        initialProps: { appUser: respondentUser },
      },
    );

    await waitFor(() =>
      expect(result.current.selectedApplicationModel?.application.id).toBe("application-1"),
    );

    act(() => {
      result.current.selectApplication("application-2");
    });

    expect(result.current.selectedApplicationModel?.application.id).toBe("application-2");

    mocks.applicationsQuery.data = [baseApplication];

    rerender({ appUser: respondentUser });

    await waitFor(() =>
      expect(result.current.selectedApplicationModel?.application.id).toBe("application-1"),
    );
  });

  it("derives owned posts from ownership even when the user is respondent-labelled", async () => {
    const respondentOwnedPost: InterviewPost = {
      ...secondPost,
      founder: {
        bio: null,
        id: respondentUser.id,
        name: respondentUser.name,
        profile_image_url: null,
        role: respondentUser.role,
      },
      founder_id: respondentUser.id,
      id: "post-owned-by-respondent",
      title: "응답자 계정이 만든 모집글",
    };
    mocks.postsQuery.data = [basePost, respondentOwnedPost];

    const { result } = renderHook(() => useMyInterviewsPageController({ appUser: respondentUser }));

    await waitFor(() => {
      expect(result.current.canManageFounderPosts).toBe(true);
      expect(result.current.tabs.map((tab) => tab.value)).toEqual(["applications", "posts"]);
      expect(result.current.myFounderPosts.map((post) => post.id)).toEqual([
        "post-owned-by-respondent",
      ]);
    });
  });

  it("delegates founder review mutations and session creation through the focused controller", () => {
    const sessionInput: CreateSessionInput = {
      application_id: baseApplication.id,
      meeting_type: "online",
      meeting_url: "https://example.com/session",
      place: null,
      scheduled_at: "2026-07-25T09:00:00+09:00",
    };

    const { result } = renderHook(() => useMyInterviewsPageController({ appUser: founderUser }));

    act(() => {
      result.current.selectFounderApplication(baseApplication.id);
      result.current.rejectFounderApplication(baseApplication.id, "이번 조건과는 맞지 않아요.");
      result.current.createFounderSession(sessionInput);
    });

    expect(mocks.updateApplicationStatusMutation.mutate).toHaveBeenNthCalledWith(1, {
      applicationId: "application-1",
      input: { status: "selected" },
    });
    expect(mocks.updateApplicationStatusMutation.mutate).toHaveBeenNthCalledWith(2, {
      applicationId: "application-1",
      input: {
        rejection_reason: "이번 조건과는 맞지 않아요.",
        status: "rejected",
      },
    });
    expect(mocks.createSessionMutation.mutate).toHaveBeenCalledWith(sessionInput);
  });
});
