import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Application, InterviewPost } from "../../../shared/api/types";
import { FounderPostCard } from "./FounderPostCard";

const post: InterviewPost = {
  id: "post-1",
  founder_id: "owner-1",
  title: "인터뷰 지원자 모집",
  service_summary: "사용 경험 확인",
  target_description: "최근 이용자",
  status: "open",
  recruitment_type: "interview",
  entry_mode: "application_required",
  schedule_options: [],
  duration_minutes: 30,
  interview_mode: "online",
  reward_amount: 15000,
  recruit_count: 5,
  founder: null,
  founder_review_summary: null,
  distance_meters: null,
  location: null,
  location_text: null,
  location_address: null,
  location_place_name: null,
  location_latitude: null,
  location_longitude: null,
  location_precision: null,
  location_source: null,
};

const applications: Application[] = Array.from({ length: 4 }, (_, index) => ({
  id: `application-${index + 1}`,
  interview_post_id: post.id,
  respondent_id: `participant-${index + 1}`,
  answers: { reason: `${index + 1}번째 지원자 답변` },
  available_times: [],
  status: "applied",
  rejection_reason: null,
}));

afterEach(cleanup);

describe("FounderPostCard", () => {
  it("keeps every applicant accessible instead of stopping at the first three", () => {
    render(
      <FounderPostCard
        applications={applications}
        post={post}
        onCreateSession={vi.fn()}
        onRejectApplication={vi.fn()}
        onSelectApplication={vi.fn()}
      />,
    );

    expect(screen.getByText("지원 4명 · 선정 0명")).toBeInTheDocument();
    expect(screen.getByText("4번째 지원자 답변")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지원자 4명" })).not.toBeInTheDocument();
  });
});
