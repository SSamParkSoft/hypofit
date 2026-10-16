import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser, Application, InterviewPost, Session } from "../shared/api/types";

const mocks = vi.hoisted(() => ({
  markViewed: vi.fn(),
  isPending: false,
  post: null as InterviewPost | null,
  applications: [] as Application[],
  chatRooms: [] as Array<{ id: string; application_id: string; interview_post_id: string; status: "selected" | "closed"; is_hidden: boolean }>,
  detailRoomIds: [] as Array<string | null>,
  detailShowOverview: [] as boolean[],
  sessions: [] as Session[],
  appUser: null as AppUser | null,
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => ({ appUser: mocks.appUser }),
}));
vi.mock("../features/applications/useApplications", () => ({
  useApplications: () => ({ data: mocks.applications }),
}));
vi.mock("../features/chat/useChatRooms", () => ({
  useChatRooms: () => ({ data: mocks.chatRooms }),
}));
vi.mock("../features/sessions/useSessions", () => ({
  useSessions: () => ({ data: mocks.sessions }),
}));
vi.mock("../features/applications/useApplicationMutations", () => ({
  useCreateApplication: () => ({ error: null, isPending: false, mutate: vi.fn() }),
}));
vi.mock("../features/interview-posts/usePostingDetail", () => ({
  usePostingDetail: () => ({ data: mocks.post, isError: false, isLoading: false }),
}));
vi.mock("../features/interview-posts/useInterviewPostViews", () => ({
  // Mutation results change identity as pending/success state changes.
  useMarkInterviewPostViewed: () => ({ mutate: mocks.markViewed, isPending: mocks.isPending }),
}));
vi.mock("../features/interview-posts/components/OpportunityExpandedDetail", () => ({
  OpportunityExpandedDetail: ({ chatRoomId, showOverview }: { chatRoomId?: string | null; showOverview?: boolean }) => {
    mocks.detailRoomIds.push(chatRoomId ?? null);
    mocks.detailShowOverview.push(showOverview ?? true);
    return null;
  },
}));

import { InterviewDetailPage } from "./InterviewDetailPage";

function createPost(id = "post-1"): InterviewPost {
  return {
    id,
    founder_id: "owner-1",
    founder: null,
    founder_review_summary: null,
    title: "QA interview",
    service_summary: "QA summary",
    target_description: "QA participants",
    duration_minutes: 30,
    interview_mode: "online",
    status: "open",
    recruit_count: 1,
    reward_amount: 0,
    schedule_options: [],
    distance_meters: null,
    location: null,
    location_address: null,
    location_latitude: null,
    location_longitude: null,
    location_place_name: null,
    location_precision: null,
    location_source: null,
    location_text: null,
  };
}

beforeEach(() => {
  mocks.markViewed.mockReset();
  mocks.isPending = false;
  mocks.post = createPost();
  mocks.applications = [];
  mocks.chatRooms = [];
  mocks.detailRoomIds = [];
  mocks.detailShowOverview = [];
  mocks.sessions = [];
  mocks.appUser = null;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("InterviewDetailPage view recording", () => {
  it("keeps the page title as the only level-one heading", () => {
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.getByRole("heading", { level: 1, name: "공고 상세" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2, name: "QA interview" })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 3, name: "서비스 설명" })).toHaveLength(2);
  });

  it("does not repeat article overview content in either responsive action panel", () => {
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.detailShowOverview).toEqual([false, false]);
    expect(screen.getAllByText("QA summary")).toHaveLength(2);
    expect(screen.getAllByText("QA participants")).toHaveLength(2);
  });

  it("offers only the selected participant's active beta room to the detail CTA", () => {
    mocks.appUser = {
      bio: null, email: "participant@example.com", id: "participant-1", name: "QA participant",
      organization_name: null, organization_type: null, phone: null,
      profile_image_path: null, profile_image_url: null, role: "respondent",
    };
    mocks.post = { ...createPost(), recruitment_type: "beta_test" };
    mocks.applications = [{
      answers: {}, available_times: [], id: "application-1", interview_post_id: "post-1",
      rejection_reason: null, respondent_id: "participant-1", status: "selected",
    }];
    mocks.chatRooms = [
      { id: "other-room", application_id: "application-2", interview_post_id: "post-1", status: "selected", is_hidden: false },
      { id: "room-1", application_id: "application-1", interview_post_id: "post-1", status: "selected", is_hidden: false },
    ];

    const { rerender } = render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.detailRoomIds).toEqual(["room-1", "room-1"]);

    mocks.detailRoomIds = [];
    mocks.post = { ...mocks.post, recruitment_type: "survey" };
    rerender(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.detailRoomIds).toEqual([null, null]);
  });

  it("shows a selected interview's confirmed schedule before the generic details", () => {
    mocks.appUser = {
      bio: null,
      email: "participant@example.com",
      id: "participant-1",
      name: "QA participant",
      organization_name: null,
      organization_type: null,
      phone: null,
      profile_image_path: null,
      profile_image_url: null,
      role: "respondent",
    };
    mocks.applications = [{
      answers: {},
      available_times: [],
      id: "application-1",
      interview_post_id: "post-1",
      rejection_reason: null,
      respondent_id: "participant-1",
      status: "selected",
    }];
    mocks.sessions = [{
      application_id: "application-1",
      id: "session-1",
      meeting_type: "offline",
      meeting_url: null,
      place: "QA 전용 장소",
      scheduled_at: "2026-10-15T08:00:00Z",
      status: "scheduled",
    }];
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.getAllByRole("heading", { name: "확정된 일정" })).toHaveLength(2);
    expect(screen.getAllByText("QA 전용 장소")).toHaveLength(2);
    expect(screen.queryByText("신청 상태를 확인하고 채팅에서 다음 일정을 조율할 수 있어요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "가능한 일정" })).not.toBeInTheDocument();
  });
  it("does not show an applicant's confirmed schedule to the posting owner", () => {
    mocks.appUser = {
      bio: null,
      email: "owner@example.com",
      id: "owner-1",
      name: "QA owner",
      organization_name: null,
      organization_type: null,
      phone: null,
      profile_image_path: null,
      profile_image_url: null,
      role: "founder",
    };
    mocks.applications = [{
      answers: {},
      available_times: [],
      id: "application-1",
      interview_post_id: "post-1",
      rejection_reason: null,
      respondent_id: "participant-1",
      status: "selected",
    }];
    mocks.sessions = [{
      application_id: "application-1",
      id: "session-1",
      meeting_type: "offline",
      meeting_url: null,
      place: "QA 전용 장소",
      scheduled_at: "2026-10-15T08:00:00Z",
      status: "scheduled",
    }];
    mocks.post = {
      ...createPost(),
      images: [{
        alt_text: null,
        height: 600,
        id: "image-1",
        url: "https://example.com/post-image.jpg",
        url_expires_at: "2026-10-20T00:00:00Z",
        width: 800,
      }],
    };

    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.queryByRole("heading", { name: "확정된 일정" })).not.toBeInTheDocument();
    expect(screen.queryByText("QA 전용 장소")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공고 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "모집자 정보" })).not.toBeInTheDocument();
    expect(mocks.detailRoomIds).toHaveLength(0);
    expect(screen.getByText("QA summary")).toBeInTheDocument();
    expect(screen.getByText("QA participants")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공고 이미지 1 크게 보기" })).toBeInTheDocument();
  });
  it.each(["direct", "application_required"] as const)("keeps %s surveys separate from interview modality and location", (entryMode) => {
    mocks.post = { ...createPost(), recruitment_type: "survey", entry_mode: entryMode,
      participation_deadline_at: "2026-10-20T10:00:00+09:00" };
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.getAllByText("온라인 설문")).toHaveLength(4);
    expect(screen.queryByText("화상")).not.toBeInTheDocument();
    expect(screen.queryByText("장소")).not.toBeInTheDocument();
    expect(screen.queryByText("세부 장소는 모집자와 협의해요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "가능한 일정" })).not.toBeInTheDocument();
    expect(screen.getAllByText("참여 마감")).toHaveLength(2);
  });
  it("shows beta periods and platforms in both responsive articles", () => {
    mocks.post = { ...createPost(), recruitment_type: "beta_test", duration_minutes: 0,
      duration_value: 7, duration_unit: "days", beta_test_platforms: ["ios", "android"],
      compensations: [{ type: "coupon_or_access", label: "프리미엄 이용권" }] };
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.getAllByText("7일")).toHaveLength(2);
    expect(screen.getAllByText("예상 참여 기간")).toHaveLength(2);
    expect(screen.getAllByText("테스트 플랫폼")).toHaveLength(2);
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
    expect(screen.getAllByText("프리미엄 이용권")).toHaveLength(2);
    expect(screen.queryByText("0원")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "인터뷰 상세" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "가능한 일정" })).not.toBeInTheDocument();
    expect(screen.queryByText("장소")).not.toBeInTheDocument();
    expect(screen.queryByText(/채팅에서.*일정.*조율/)).not.toBeInTheDocument();
  });
  it("shows an actual offline interview location without a fallback for absent places", () => {
    mocks.post = { ...createPost(), interview_mode: "offline", location_place_name: "QA 캠퍼스" };
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.getAllByText("QA 캠퍼스")).toHaveLength(2);
    expect(screen.getAllByText("장소")).toHaveLength(2);
  });
  it("shows an expired open survey as closed without changing its API status", () => {
    const now = Date.parse("2026-10-11T06:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    mocks.post = { ...createPost(), recruitment_type: "survey", participation_deadline_at: new Date(now).toISOString() };
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(screen.queryByText("모집 중")).not.toBeInTheDocument();
    expect(screen.getAllByText("마감")).toHaveLength(2);
    expect(mocks.post.status).toBe("open");
  });
  it("does not record again when mutation status or same-post data changes", () => {
    const { rerender } = render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.markViewed).toHaveBeenCalledTimes(1);
    expect(mocks.markViewed).toHaveBeenCalledWith({ postId: "post-1", source: "detail" });

    mocks.isPending = true;
    rerender(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    mocks.isPending = false;
    mocks.post = { ...createPost(), title: "Updated title" };
    rerender(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.markViewed).toHaveBeenCalledTimes(1);
  });

  it("records the next post when the detail changes", () => {
    const { rerender } = render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    mocks.post = createPost("post-2");
    rerender(<InterviewDetailPage accessToken="qa-token" postId="post-2" />);
    expect(mocks.markViewed).toHaveBeenCalledTimes(2);
    expect(mocks.markViewed).toHaveBeenLastCalledWith({ postId: "post-2", source: "detail" });
  });

  it("waits for authentication before recording", () => {
    const { rerender } = render(<InterviewDetailPage postId="post-1" />);
    expect(mocks.markViewed).not.toHaveBeenCalled();
    rerender(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.markViewed).toHaveBeenCalledTimes(1);
  });

  it("does not record an unavailable post", () => {
    mocks.post = null;
    render(<InterviewDetailPage accessToken="qa-token" postId="post-1" />);
    expect(mocks.markViewed).not.toHaveBeenCalled();
  });
});
