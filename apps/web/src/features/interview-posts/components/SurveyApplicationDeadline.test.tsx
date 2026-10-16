import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { OpportunityDetailPanel } from "./OpportunityDetailPanel";
import { OpportunityExpandedDetail } from "./OpportunityExpandedDetail";

vi.mock("./SurveyParticipationPanel", () => ({ SurveyParticipationPanel: () => <p>External survey participation</p> }));

const now = Date.parse("2026-10-11T06:00:00Z");
const post: InterviewPost = {
  id: "survey", founder_id: "owner", title: "Survey QA", service_summary: "Survey summary",
  target_description: "Participants", status: "open", recruitment_type: "survey",
  entry_mode: "application_required", participation_deadline_at: new Date(now).toISOString(),
  schedule_options: [], duration_minutes: 10, interview_mode: "online", reward_amount: 0,
  recruit_count: 10, founder: null, founder_review_summary: null, distance_meters: null,
  location: null, location_text: null, location_address: null, location_place_name: null,
  location_latitude: null, location_longitude: null, location_precision: null, location_source: null,
};

beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(now); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("survey application deadline", () => {
  it.each([OpportunityDetailPanel, OpportunityExpandedDetail])("disables new applications in %s", async (Component) => {
    const onApply = vi.fn();
    render(<Component post={post} canApply onApply={onApply} />);
    const button = screen.getByRole("button", { name: "모집 종료" });
    expect(button).toBeDisabled();
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("keeps an already-open application form but disables its submission", async () => {
    const onApply = vi.fn();
    render(<OpportunityExpandedDetail post={post} canApply initialApplyOpen onApply={onApply} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.type(screen.getByRole("textbox", { name: "관련 경험" }), "Relevant experience");
    await user.type(screen.getByRole("textbox", { name: "가능 시간" }), "Weekday evenings");
    const submit = screen.getByRole("button", { name: "신청 제출" });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(screen.getByRole("textbox", { name: "관련 경험" })).toHaveValue("Relevant experience");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("does not change an interview application with an old recruitment deadline", () => {
    render(<OpportunityExpandedDetail post={{ ...post, recruitment_type: "interview" }} canApply onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: "신청하기" })).toBeEnabled();
  });

  it.each([OpportunityDetailPanel, OpportunityExpandedDetail])("shows management rather than survey participation to the owner in %s", (Component) => {
    render(<Component post={{ ...post, entry_mode: "direct" }} canApply isOwner onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: "공고 관리" })).toBeInTheDocument();
    expect(screen.queryByText("External survey participation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "신청하기" })).not.toBeInTheDocument();
  });
});
