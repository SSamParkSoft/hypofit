import { describe, expect, it } from "vitest";

import type { Application, ChatRoom, InterviewPost, Session } from "../../../shared/api/types";
import { buildHomeDashboardData, formatInterviewPublishedTime } from "./homeDashboardModel";

const basePost: InterviewPost = {
  id: "post-1",
  founder_id: "founder-1",
  title: "구독 서비스 이용 경험 인터뷰",
  service_summary: "구독 서비스 사용 경험을 듣습니다.",
  target_description: "최근 구독 서비스를 이용한 분",
  reward_amount: 30_000,
  duration_minutes: 40,
  recruit_count: 2,
  interview_mode: "online",
  location: null,
  location_text: null,
  location_address: null,
  location_place_name: null,
  location_latitude: null,
  location_longitude: null,
  location_precision: null,
  location_source: null,
  distance_meters: null,
  schedule_options: [],
  status: "open",
};

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "application-1",
    interview_post_id: basePost.id,
    respondent_id: "respondent-1",
    answers: {},
    available_times: [],
    status: "applied",
    rejection_reason: null,
    ...overrides,
  };
}

function room(overrides: Partial<ChatRoom> = {}): ChatRoom {
  return {
    id: "room-1",
    interview_post_id: basePost.id,
    application_id: "application-1",
    founder_id: "founder-1",
    respondent_id: "respondent-1",
    status: "open",
    last_message_at: null,
    created_at: "2026-08-15T09:00:00+09:00",
    updated_at: "2026-08-15T09:00:00+09:00",
    interview_post: basePost,
    unread_count: 0,
    is_muted: false,
    is_hidden: false,
    last_read_at: null,
    ...overrides,
  };
}

describe("buildHomeDashboardData", () => {
  it("excludes expired surveys from discovery without hiding valid interview posts", () => {
    const now = Date.parse("2026-10-12T09:00:00Z");
    const expired = { ...basePost, id: "expired-survey", recruitment_type: "survey" as const,
      participation_deadline_at: new Date(now).toISOString(), reward_amount: 100_000 };
    const result = buildHomeDashboardData({ applications: [], appUserId: "respondent-1", chatRooms: [],
      posts: [expired, basePost], sessions: [], now });
    expect(result.recentInterviews.map(({ post }) => post.id)).toEqual([basePost.id]);
    expect(result.recommendation?.post.id).toBe(basePost.id);
    expect(expired.status).toBe("open");
  });
  it("prioritizes founder applications and includes unread chat work", () => {
    const result = buildHomeDashboardData({
      applications: [application()],
      appUserId: "founder-1",
      chatRooms: [room({ unread_count: 2 })],
      posts: [basePost],
      sessions: [],
    });

    expect(result.focus.title).toBe(basePost.title);
    expect(result.focus.primaryAction.label).toBe("지원자 1명 보기");
    expect(result.focus.secondaryAction).toEqual({
      href: "/chat?room=room-1",
      label: "읽지 않은 채팅 2개",
    });
  });

  it("builds the earliest future schedule and its chat deep link", () => {
    const sessions: Session[] = [
      {
        id: "session-later",
        application_id: "application-1",
        scheduled_at: "2026-08-17T19:00:00+09:00",
        meeting_type: "online",
        meeting_url: "https://meet.example/later",
        place: null,
        status: "scheduled",
      },
      {
        id: "session-next",
        application_id: "application-1",
        scheduled_at: "2026-08-16T18:30:00+09:00",
        meeting_type: "offline",
        meeting_url: null,
        place: "성수역",
        status: "scheduled",
      },
    ];

    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })],
      appUserId: "respondent-1",
      chatRooms: [room()],
      now: Date.parse("2026-08-15T12:00:00+09:00"),
      posts: [basePost],
      sessions,
    });

    expect(result.nextSchedule).toMatchObject({
      href: "/chat?room=room-1",
      interviewTitle: basePost.title,
      location: "성수역",
    });
    expect(result.nextSchedule?.when).toContain("내일");
  });

  it("recommends a real eligible post without claiming AI matching", () => {
    const highReward = {
      ...basePost,
      id: "post-high",
      founder_id: "founder-2",
      reward_amount: 70_000,
      title: "고사례비 인터뷰",
    };
    const alreadyApplied = {
      ...basePost,
      id: "post-applied",
      founder_id: "founder-3",
      reward_amount: 90_000,
    };

    const result = buildHomeDashboardData({
      applications: [application({ interview_post_id: alreadyApplied.id })],
      appUserId: "respondent-1",
      chatRooms: [],
      posts: [alreadyApplied, highReward, basePost],
      sessions: [],
    });

    expect(result.recommendation?.post.id).toBe("post-high");
    expect(result.recommendation).toEqual({ post: highReward });
    expect(result.recentInterviews).toHaveLength(3);
  });

  it("returns honest empty home states when APIs contain no records", () => {
    const result = buildHomeDashboardData({
      applications: [],
      appUserId: "user-1",
      chatRooms: [],
      posts: [],
      sessions: [],
    });

    expect(result.focus.title).toBe("지금 이어갈 인터뷰가 없어요");
    expect(result.nextSchedule).toBeNull();
    expect(result.recentInterviews).toEqual([]);
    expect(result.recommendation).toBeNull();
  });

  it.each([
    ["canonical beta period", { recruitment_type: "beta_test", duration_value: 2, duration_unit: "weeks" }, "베타테스트 · 30,000원 · 2주"],
    ["legacy beta period", { recruitment_type: "beta_test", beta_test_starts_at: "2026-08-01T00:00:00Z", beta_test_ends_at: "2026-08-15T00:00:00Z" }, "베타테스트 · 30,000원 · 14일"],
    ["research duration", { recruitment_type: "research_experiment", duration_value: 2, duration_unit: "hours" }, "연구 실험 · 30,000원 · 2시간"],
    ["missing duration", { recruitment_type: "survey", duration_minutes: 0 }, "설문조사 · 30,000원"],
    ["legacy interview", {}, "인터뷰 · 30,000원 · 40분"],
  ] satisfies [string, Partial<InterviewPost>, string][])("uses posting metadata for %s on home", (_name, overrides, expected) => {
    const result = buildHomeDashboardData({
      applications: [],
      appUserId: "respondent-1",
      chatRooms: [],
      posts: [{ ...basePost, ...overrides }],
      sessions: [],
    });

    expect(result.recentInterviews[0]?.secondaryMeta).toBe(expected);
  });
});

describe("selected posting focus", () => {
  it("routes an approved survey to its detail without an interview workflow", () => {
    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })], appUserId: "respondent-1",
      chatRooms: [], sessions: [],
      posts: [{ ...basePost, recruitment_type: "survey", entry_mode: "application_required" }],
    });

    expect(result.focus.primaryAction).toEqual({ href: "/interviews/post-1", label: "설문 참여 안내 보기" });
    expect(result.focus.body).toContain("외부 설문");
    expect(result.focus.body).not.toContain("채팅");
    expect(result.focus.stageLabel).toBe("설문 참여 안내");
    expect(result.focus.steps).toEqual([]);
    expect(result.focus.currentStep).toBe(-1);
  });

  it.each(["beta_test", "research_experiment"] as const)("keeps selected %s chat guidance without interview steps", (type) => {
    const selectedPost = { ...basePost, recruitment_type: type };
    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })], appUserId: "respondent-1",
      chatRooms: [room({ interview_post: selectedPost })], posts: [selectedPost], sessions: [],
    });

    expect(result.focus.primaryAction).toEqual({ href: "/chat?room=room-1", label: "진행 안내 확인하기" });
    expect(result.focus.body).toContain("채팅");
    expect(result.focus.body).not.toContain("인터뷰");
    expect(result.focus.stageLabel).toBe("선정 후 안내");
    expect(result.focus.steps).toEqual([]);
  });

  it.each(["interview", undefined] as const)("preserves the selected interview workflow for %s", (type) => {
    const selectedPost = { ...basePost, recruitment_type: type };
    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })], appUserId: "respondent-1",
      chatRooms: [room({ interview_post: selectedPost })], posts: [selectedPost], sessions: [],
    });

    expect(result.focus.primaryAction).toEqual({ href: "/chat?room=room-1", label: "일정 조율하기" });
    expect(result.focus.body).toBe("선정된 인터뷰예요. 채팅에서 가능한 일정과 진행 방식을 조율해보세요.");
    expect(result.focus.steps).toEqual(["신청", "선정", "일정 조율", "인터뷰"]);
    expect(result.focus.currentStep).toBe(2);
  });

  it.each(["beta_test", "research_experiment"] as const)("preserves %s source type when an older chat summary omits it", (type) => {
    const selectedPost = { ...basePost, recruitment_type: type };
    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })], appUserId: "respondent-1",
      chatRooms: [room({ interview_post: basePost })], posts: [selectedPost], sessions: [],
    });
    expect(result.focus.primaryAction).toEqual({ href: "/chat?room=room-1", label: "진행 안내 확인하기" });
    expect(result.focus.steps).toEqual([]);
  });

  it("uses neutral participation navigation when the posting is unavailable", () => {
    const result = buildHomeDashboardData({
      applications: [application({ status: "selected" })], appUserId: "respondent-1",
      chatRooms: [], posts: [], sessions: [],
    });

    expect(result.focus.primaryAction).toEqual({ href: "/my-interviews?tab=applications", label: "내 참여 보기" });
    expect(result.focus.body).not.toMatch(/인터뷰|채팅|일정/);
    expect(result.focus.title).toBe("선정된 공고가 있어요");
    expect(result.focus.steps).toEqual([]);
  });
});

describe("non-interview focus context", () => {
  it.each(["survey", "beta_test", "research_experiment"] as const)("does not promise interview steps to the %s owner", (type) => {
    const result = buildHomeDashboardData({ applications: [application()], appUserId: "founder-1",
      chatRooms: [], sessions: [], posts: [{ ...basePost, recruitment_type: type }] });
    expect(result.focus.primaryAction.label).toBe("지원자 1명 보기");
    expect(result.focus.steps).toEqual([]);
    expect(result.focus.currentStep).toBe(-1);
  });

  it.each(["survey", "beta_test", "research_experiment"] as const)("keeps pending %s results out of interview chat guidance", (type) => {
    const result = buildHomeDashboardData({ applications: [application()], appUserId: "respondent-1",
      chatRooms: [], sessions: [], posts: [{ ...basePost, recruitment_type: type }] });
    expect(result.focus.primaryAction).toEqual({ href: "/my-interviews?tab=applications", label: "신청 상태 보기" });
    expect(result.focus.steps).toEqual([]);
    expect(result.focus.currentStep).toBe(-1);
    expect(result.focus.body).not.toContain("채팅");
  });

  it.each(["beta_test", "research_experiment"] as const)("does not attach interview steps to unread %s guidance", (type) => {
    const result = buildHomeDashboardData({ applications: [], appUserId: "respondent-1",
      chatRooms: [room({ unread_count: 1, interview_post: { ...basePost, recruitment_type: type } })],
      sessions: [], posts: [{ ...basePost, recruitment_type: type }] });
    expect(result.focus.primaryAction).toEqual({ href: "/chat?room=room-1", label: "채팅 확인하기" });
    expect(result.focus.steps).toEqual([]);
    expect(result.focus.currentStep).toBe(-1);
  });
});

describe("formatInterviewPublishedTime", () => {
  const now = Date.parse("2026-08-17T12:00:00+09:00");

  it("formats recent interview post creation times", () => {
    expect(formatInterviewPublishedTime("2026-08-17T11:45:00+09:00", now)).toBe("15분 전 등록");
    expect(formatInterviewPublishedTime("2026-08-17T09:00:00+09:00", now)).toBe("3시간 전 등록");
    expect(formatInterviewPublishedTime("2026-08-15T12:00:00+09:00", now)).toBe("2일 전 등록");
  });

  it("keeps a calm fallback until older API responses include created_at", () => {
    expect(formatInterviewPublishedTime(undefined, now)).toBe("최근 등록");
  });
});
