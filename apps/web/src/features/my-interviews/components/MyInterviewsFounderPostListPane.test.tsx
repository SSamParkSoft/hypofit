import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { MyInterviewsFounderPostListPane } from "./MyInterviewsFounderPostListPane";

const post: InterviewPost = {
  id: "beta", founder_id: "owner", title: "Beta QA", service_summary: "Beta summary",
  target_description: "Participants", status: "open", recruitment_type: "beta_test",
  entry_mode: "application_required", schedule_options: [], duration_minutes: 0,
  duration_value: 2, duration_unit: "weeks", beta_test_platforms: ["ios", "android"],
  interview_mode: "online", reward_amount: 0, recruit_count: 10,
  compensations: [{ type: "coupon_or_access", label: "프리미엄 이용권" }],
  founder: null, founder_review_summary: null, distance_meters: null,
  location: null, location_text: null, location_address: null, location_place_name: null,
  location_latitude: null, location_longitude: null, location_precision: null, location_source: null,
};
afterEach(cleanup);

function renderPost(value: InterviewPost) {
  return render(<MyInterviewsFounderPostListPane posts={[value]} applicationsByPostId={new Map()}
    headingId="posts" selectedPostId={value.id} onSelectPost={vi.fn()} />);
}

describe("owner list metadata", () => {
  it("shows beta period, platforms and non-cash compensation", () => {
    renderPost(post);
    const row = screen.getByRole("button");
    expect(row).toHaveTextContent("iOS · Android · 2주");
    expect(row).toHaveTextContent("프리미엄 이용권");
    expect(row).not.toHaveTextContent("0분");
    expect(row).not.toHaveTextContent("0원");
  });
  it("does not invent a missing period", () => {
    renderPost({ ...post, duration_value: null, duration_unit: null });
    expect(screen.getByRole("button")).not.toHaveTextContent("0분");
    expect(screen.getByRole("button")).toHaveTextContent("iOS · Android");
  });
  it("retains legacy interview minutes and cash", () => {
    renderPost({ ...post, recruitment_type: undefined, duration_value: null, duration_unit: null,
      duration_minutes: 40, reward_amount: 30000, compensations: [] });
    expect(screen.getByRole("button")).toHaveTextContent("화상 · 40분");
    expect(screen.getByRole("button")).toHaveTextContent("30,000원");
  });
});
