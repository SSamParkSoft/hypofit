import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { navigateTo } from "../../../shared/navigation/appNavigation";
import { InterviewResultsList } from "./InterviewResultsList";

vi.mock("../../../shared/navigation/appNavigation", () => ({
  navigateTo: vi.fn(),
  navigateToInterviewDetail: vi.fn(),
}));

const post: InterviewPost = {
  id: "survey-1", founder_id: "owner-1", title: "설문 공고", service_summary: "설문 요약",
  target_description: "설문 대상", status: "open", recruitment_type: "survey",
  entry_mode: "application_required", schedule_options: [], duration_minutes: 10,
  interview_mode: "online", reward_amount: 0, recruit_count: 10,
  founder: null, founder_review_summary: null, distance_meters: null,
  location: null, location_text: null, location_address: null, location_place_name: null,
  location_latitude: null, location_longitude: null, location_precision: null, location_source: null,
};

function renderList(viewerId: string) {
  return render(<InterviewResultsList activePostId={post.id} applicationByPostId={new Map()}
    canApply filteredPosts={[post]} isError={false} isLoading={false} onApply={vi.fn()}
    onSelect={vi.fn()} selectedPostId={post.id} viewedPostIds={new Set()} viewerId={viewerId} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InterviewResultsList ownership", () => {
  it("shows management instead of application in an owner's expanded row", async () => {
    renderList("owner-1");
    expect(screen.getByRole("button", { name: "공고 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "신청하기" })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "공고 관리" }));
    expect(navigateTo).toHaveBeenCalledWith("/my-interviews?tab=posts&post=survey-1");
  });

  it("keeps the application action for a different viewer", () => {
    renderList("participant-1");
    expect(screen.getByRole("button", { name: "신청하기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "공고 관리" })).not.toBeInTheDocument();
  });
});
