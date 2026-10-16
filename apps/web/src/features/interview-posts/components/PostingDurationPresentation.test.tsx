import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityDetailPanel } from "./OpportunityDetailPanel";
import { FounderPostCard } from "./FounderPostCard";
import { OpportunityExpandedDetail } from "./OpportunityExpandedDetail";
import { postingDetailLocationLabel, postingDurationLabel, postingParticipationLabel } from "./postingPresentation";
import { navigateTo } from "../../../shared/navigation/appNavigation";

vi.mock("../../../shared/navigation/appNavigation", () => ({
  navigateTo: vi.fn(),
  navigateToInterviewDetail: vi.fn(),
}));

const post: InterviewPost = {
  id: "beta", founder_id: "owner", title: "Beta QA", service_summary: "Beta summary",
  target_description: "Participants", status: "open", recruitment_type: "beta_test",
  entry_mode: "application_required", schedule_options: [], duration_minutes: 0,
  duration_value: 2, duration_unit: "weeks", beta_test_platforms: ["ios", "android"],
  interview_mode: "online", reward_amount: 0, recruit_count: 10,
  founder: null, founder_review_summary: null, distance_meters: null,
  location: null, location_text: null, location_address: null, location_place_name: null,
  location_latitude: null, location_longitude: null, location_precision: null, location_source: null,
};

const application: Application = {
  id: "application", interview_post_id: post.id, respondent_id: "participant",
  answers: { relevant_experience: "I use the product every day." }, available_times: [],
  status: "selected", rejection_reason: null,
};

afterEach(cleanup);

describe("posting duration presentation", () => {
  it("keeps the full-detail action panel free of repeated post description and eligibility", () => {
    render(<OpportunityExpandedDetail post={post} canApply onApply={vi.fn()} showOverview={false} />);
    expect(screen.queryByText("Beta summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Participants")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "신청하기" })).toBeInTheDocument();
  });

  it("shows a real offline interview or research place, but not an online or beta place", () => {
    expect(postingDetailLocationLabel({ ...post, recruitment_type: "interview", interview_mode: "offline",
      location_place_name: "QA 연구실", location: "기존 장소" })).toBe("QA 연구실");
    expect(postingDetailLocationLabel({ ...post, recruitment_type: "research_experiment", interview_mode: "offline",
      location_text: "QA 캠퍼스" })).toBe("QA 캠퍼스");
    expect(postingDetailLocationLabel({ ...post, recruitment_type: undefined, interview_mode: "offline",
      location: "QA 장소" })).toBe("QA 장소");
    expect(postingDetailLocationLabel({ ...post, recruitment_type: "interview", interview_mode: "online",
      location: "QA 장소" })).toBeNull();
    expect(postingDetailLocationLabel({ ...post, location: "QA 장소" })).toBeNull();
  });

  it("opens the selected beta participant's room when the detail has one", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    vi.mocked(navigateTo).mockClear();
    render(<OpportunityExpandedDetail post={post} existingApplication={application}
      chatRoomId="room/1" canApply onApply={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "채팅 보기" }));
    expect(navigateTo).toHaveBeenCalledWith("/chat?room=room%2F1");
    expect(screen.queryByRole("button", { name: "내 참여 보기" })).not.toBeInTheDocument();
  });

  it("does not open a room for an unselected beta application", () => {
    render(<OpportunityExpandedDetail post={post} existingApplication={{ ...application, status: "applied" }}
      chatRoomId="room-1" canApply onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: "내 참여 보기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "채팅 보기" })).not.toBeInTheDocument();
  });

  it.each(["beta_test", "survey", "research_experiment"] as const)("does not offer interview session creation for a selected %s applicant", (type) => {
    render(<FounderPostCard post={{ ...post, recruitment_type: type }} applications={[application]}
      onCreateSession={vi.fn()} onRejectApplication={vi.fn()} onSelectApplication={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "일정 생성" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("확정 시간")).not.toBeInTheDocument();
  });

  it.each(["interview", undefined] as const)("preserves session creation for an explicit or legacy interview %s", (type) => {
    render(<FounderPostCard post={{ ...post, recruitment_type: type }} applications={[application]}
      onCreateSession={vi.fn()} onRejectApplication={vi.fn()} onSelectApplication={vi.fn()} />);
    expect(screen.getByRole("button", { name: "일정 생성" })).toBeInTheDocument();
  });

  it.each(["beta_test", "survey", "research_experiment"] as const)("does not promise interview session creation when selecting a %s applicant", async (type) => {
    render(<FounderPostCard post={{ ...post, recruitment_type: type }} applications={[{ ...application, status: "applied" }]}
      onCreateSession={vi.fn()} onRejectApplication={vi.fn()} onSelectApplication={vi.fn()} />);
    const userEvent = (await import("@testing-library/user-event")).default;
    await userEvent.setup().click(screen.getByRole("button", { name: "선정" }));
    expect(screen.getByRole("dialog")).not.toHaveTextContent("인터뷰 일정을 생성");
    expect(screen.getByRole("dialog")).toHaveTextContent("공고에 안내한 참여 절차");
  });

  it.each(["applied", "selected", "rejected", "canceled"] as const)("does not promise interview coordination after a beta application is %s", (status) => {
    render(<OpportunityExpandedDetail post={post} existingApplication={{ ...application, status }} canApply onApply={vi.fn()} />);
    expect(screen.queryByText(/이후 조율은 내 인터뷰나 채팅/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 참여 보기" })).toBeInTheDocument();
  });

  it.each(["applied", "selected", "rejected", "canceled"] as const)("does not label an application with status %s as a new submission", (status) => {
    render(<OpportunityExpandedDetail post={post} existingApplication={{ ...application, status }} canApply onApply={vi.fn()} />);
    expect(screen.getByText("신청 내역")).toBeInTheDocument();
    expect(screen.queryByText("신청을 보냈어요")).not.toBeInTheDocument();
  });

  it.each([
    ["minutes", "2분"], ["hours", "2시간"], ["days", "2일"], ["weeks", "2주"],
  ] as const)("uses the canonical %s unit", (unit, expected) => {
    expect(postingDurationLabel({ ...post, duration_unit: unit })).toBe(expected);
  });

  it("prefers the entered duration over the test calendar range", () => {
    expect(postingDurationLabel({ ...post, beta_test_starts_at: "2026-09-01T00:00:00Z",
      beta_test_ends_at: "2026-10-01T00:00:00Z" })).toBe("2주");
  });

  it.each([
    [null, null], ["invalid", "2026-09-21T00:00:00Z"],
    ["2026-09-21T00:00:00Z", "2026-09-07T00:00:00Z"],
  ])("does not invent a duration from unusable legacy dates %s / %s", (start, end) => {
    expect(postingDurationLabel({ ...post, duration_value: null, duration_unit: null,
      beta_test_starts_at: start, beta_test_ends_at: end })).toBeNull();
  });

  it("normalizes known platforms and preserves organizer-entered labels", () => {
    expect(postingParticipationLabel({ ...post, beta_test_platforms: [" iOS ", "ANDROID", "web", "other", "Desktop app"] }))
      .toBe("iOS · Android · Web · 기타 · Desktop app");
    expect(postingParticipationLabel({ ...post, beta_test_platforms: [] })).toBe("베타테스트");
  });

  it("shows canonical period and platforms in a discovery row", () => {
    render(<OpportunityCard post={post} onSelect={vi.fn()} />);
    expect(screen.getByText("2주")).toBeInTheDocument();
    expect(screen.getByText("iOS · Android")).toBeInTheDocument();
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
  });

  it("uses beta-specific labels in the existing detail panel", () => {
    render(<OpportunityDetailPanel post={post} canApply onApply={vi.fn()} />);
    expect(screen.getByText("예상 참여 기간")).toBeInTheDocument();
    expect(screen.getByText("테스트 플랫폼")).toBeInTheDocument();
    expect(screen.getByText("2주")).toBeInTheDocument();
    expect(screen.getByText("iOS · Android")).toBeInTheDocument();
    expect(screen.queryByText("장소")).not.toBeInTheDocument();
  });

  it("shows the same period and non-cash reward in the owner summary", () => {
    render(<FounderPostCard post={{ ...post, compensations: [{ type: "coupon_or_access", label: "프리미엄 이용권" }] }} applications={[]} onCreateSession={vi.fn()}
      onRejectApplication={vi.fn()} onSelectApplication={vi.fn()} />);
    expect(screen.getByText("2주")).toBeInTheDocument();
    expect(screen.getByText("프리미엄 이용권")).toBeInTheDocument();
    expect(screen.queryByText("0원")).not.toBeInTheDocument();
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
  });

  it("does not show interview time coordination instructions for a beta application", () => {
    render(<OpportunityExpandedDetail post={post} canApply onApply={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "가능 시간" })).not.toBeInTheDocument();
    expect(screen.queryByText("신청 후 모집자와 일정을 조율해요.")).not.toBeInTheDocument();
  });

  it("uses the stored date period when legacy beta duration fields are missing", () => {
    render(<OpportunityCard post={{ ...post, duration_value: null, duration_unit: null,
      beta_test_starts_at: "2026-09-07T06:00:00Z", beta_test_ends_at: "2026-09-21T06:00:00Z" }} onSelect={vi.fn()} />);
    expect(screen.getByText("14일")).toBeInTheDocument();
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
  });

  it("does not invent a zero-minute duration when no period is available", () => {
    render(<OpportunityDetailPanel post={{ ...post, duration_value: null, duration_unit: null }} canApply onApply={vi.fn()} />);
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
    expect(screen.queryByText("예상 참여 기간")).not.toBeInTheDocument();
  });

  it("preserves compact rows without adding a duration", () => {
    render(<OpportunityCard post={post} variant="compact" onSelect={vi.fn()} />);
    expect(screen.queryByText("2주")).not.toBeInTheDocument();
  });

  it("preserves legacy interview minute values", () => {
    render(<OpportunityDetailPanel post={{ ...post, recruitment_type: "interview",
      duration_value: null, duration_unit: null, duration_minutes: 40 }} canApply onApply={vi.fn()} />);
    expect(screen.getByText("40분")).toBeInTheDocument();
    expect(screen.getByText("예상 시간")).toBeInTheDocument();
    expect(screen.getByText("진행 방식")).toBeInTheDocument();
  });
});
