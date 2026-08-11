import { describe, expect, it } from "vitest";

import type { Application, InterviewPost, Session } from "../../shared/api/types";
import {
  buildApplicationReadModels,
  buildSessionReadModels,
  formatAnswerLabel,
  shortId,
} from "./readModels";

const post: InterviewPost = {
  id: "post-123456789",
  founder_id: "founder-1",
  title: "1인 가구 장보기 인터뷰",
  service_summary: "식재료 낭비 문제 검증",
  target_description: "최근 직접 장을 본 1인 가구",
  reward_amount: 15000,
  duration_minutes: 30,
  recruit_count: 0,
  interview_mode: "online",
  location: null,
  location_address: null,
  location_latitude: null,
  location_longitude: null,
  location_place_name: null,
  location_precision: null,
  location_source: null,
  location_text: null,
  distance_meters: null,
  schedule_options: ["평일 저녁"],
  status: "open",
};

const application: Application = {
  id: "application-123456789",
  interview_post_id: post.id,
  respondent_id: "respondent-123456789",
  respondent: {
    id: "respondent-123456789",
    name: "김응답",
    bio: "사용자 인터뷰에 참여하고 있어요.",
    profile_image_url: "https://example.com/profile.png",
    role: "respondent",
  },
  answers: {
    relevant_experience: "최근 장을 본 경험이 있습니다.",
  },
  available_times: ["평일 20시 이후"],
  status: "selected",
  rejection_reason: null,
};

const session: Session = {
  id: "session-1",
  application_id: application.id,
  scheduled_at: "2026-05-20T10:30:00.000Z",
  meeting_type: "online",
  meeting_url: "https://meet.google.com/abc-defg-hij",
  place: null,
  status: "scheduled",
};

describe("workflow read models", () => {
  it("builds application display data from application, post, and session records", () => {
    expect(
      buildApplicationReadModels({
        applications: [application],
        posts: [post],
        sessions: [session],
      })[0],
    ).toMatchObject({
      answerCount: 1,
      applicationLabel: "지원 applicat",
      availableTimeCount: 1,
      displayTitle: "1인 가구 장보기 인터뷰",
      respondentLabel: "김응답",
      targetSummary: "최근 직접 장을 본 1인 가구",
    });
  });

  it("builds schedule display data from session records", () => {
    expect(
      buildSessionReadModels({
        applications: [application],
        posts: [post],
        sessions: [session],
      })[0],
    ).toMatchObject({
      applicationLabel: "지원 applicat",
      respondentLabel: "김응답",
      title: "1인 가구 장보기 인터뷰",
    });
  });

  it("does not expose a respondent id when the user summary is unavailable", () => {
    const deletedUserApplication = { ...application, respondent: null };

    expect(
      buildApplicationReadModels({
        applications: [deletedUserApplication],
        posts: [post],
        sessions: [],
      })[0]?.respondentLabel,
    ).toBe("탈퇴한 사용자");

    expect(
      buildSessionReadModels({
        applications: [deletedUserApplication],
        posts: [post],
        sessions: [session],
      })[0]?.respondentLabel,
    ).toBe("탈퇴한 사용자");
  });

  it("formats known answer keys and short IDs", () => {
    expect(formatAnswerLabel("relevant_experience")).toBe("관련 경험");
    expect(formatAnswerLabel("other_answer")).toBe("other answer");
    expect(shortId("1234567890")).toBe("12345678");
  });
});
