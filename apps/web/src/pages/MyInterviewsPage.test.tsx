import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Application, AppUser, InterviewPost, Session } from "../shared/api/types";

const mocks = vi.hoisted(() => ({
  authState: {
    accessToken: "token-123",
  },
  createSessionMutation: {
    error: null as Error | null,
    isPending: false,
    mutate: vi.fn(),
  },
  navigateTo: vi.fn(),
  navigateToInterviewDetail: vi.fn(),
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

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../features/interview-posts/useInterviewPosts", () => ({
  useInterviewPosts: () => mocks.postsQuery,
}));

vi.mock("../features/applications/useApplications", () => ({
  useApplications: () => mocks.applicationsQuery,
}));

vi.mock("../features/sessions/useSessions", () => ({
  useSessions: () => mocks.sessionsQuery,
}));

vi.mock("../features/applications/useApplicationMutations", () => ({
  useUpdateApplicationStatus: () => mocks.updateApplicationStatusMutation,
}));

vi.mock("../features/sessions/useSessionMutations", () => ({
  useCreateSession: () => mocks.createSessionMutation,
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateTo: mocks.navigateTo,
  navigateToInterviewDetail: mocks.navigateToInterviewDetail,
}));

import { MyInterviewsPage } from "./MyInterviewsPage";

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

const baseSession: Session = {
  application: null,
  application_id: baseApplication.id,
  id: "session-1",
  meeting_type: "online",
  meeting_url: "https://example.com/meeting",
  place: null,
  scheduled_at: "2026-07-22T14:00:00+09:00",
  status: "scheduled",
};

describe("MyInterviewsPage", () => {
  beforeEach(() => {
    mocks.navigateTo.mockReset();
    mocks.navigateToInterviewDetail.mockReset();
    mocks.postsQuery.data = [basePost];
    mocks.postsQuery.isError = false;
    mocks.postsQuery.isLoading = false;
    mocks.applicationsQuery.data = [baseApplication];
    mocks.applicationsQuery.isError = false;
    mocks.applicationsQuery.isLoading = false;
    mocks.sessionsQuery.data = [baseSession];
    mocks.sessionsQuery.isLoading = false;
  });

  it("keeps both tabs available for respondent-labelled users and routes the detail CTA to the interview detail page", async () => {
    const user = userEvent.setup();

    render(<MyInterviewsPage appUser={respondentUser} />);

    expect(screen.getByRole("tab", { name: /신청한 인터뷰/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /내 모집글/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "모집글 보기" })[0]);

    expect(mocks.navigateToInterviewDetail).toHaveBeenCalledWith("post-1");
  });

  it("lets respondent-labelled users open the posts tab and start a new post", async () => {
    const user = userEvent.setup();
    mocks.postsQuery.data = [];
    mocks.applicationsQuery.data = [];

    render(<MyInterviewsPage appUser={respondentUser} />);

    const postsTab = screen.getAllByRole("tab", { name: /내 모집글/i })[0];
    await user.click(postsTab);

    expect(screen.getAllByText("아직 만든 모집글이 없습니다.")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "모집글 만들기" })[0]);

    expect(mocks.navigateTo).toHaveBeenCalledWith("/interviews/new");
  });
});
