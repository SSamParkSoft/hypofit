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
