import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatRoom, InterviewPost } from "@hypofit/contracts";
import { InterviewContextBar, InterviewContextPanel } from "./InterviewContext";

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
const room: ChatRoom = {
  id: "room", interview_post_id: post.id, application_id: "application",
  founder_id: "owner", respondent_id: "participant", status: "selected",
  last_message_at: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  interview_post: post, unread_count: 0, is_muted: false, is_hidden: false, last_read_at: null,
};
afterEach(cleanup);

describe("type-specific chat posting context", () => {
  it("uses the canonical beta period, platforms and reward in the compact bar", () => {
    render(<InterviewContextBar room={room} isOpen={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("2주");
    expect(screen.getByRole("button")).toHaveTextContent("iOS · Android");
    expect(screen.getByRole("button")).toHaveTextContent("프리미엄 이용권");
    expect(screen.getByRole("button")).not.toHaveTextContent("0분");
    expect(screen.getByRole("button")).not.toHaveTextContent("화상");
  });
  it("does not add interview availability guidance to an expanded beta context", () => {
    render(<InterviewContextBar room={room} isOpen onToggle={vi.fn()} />);
    expect(screen.queryByText("가능 시간")).not.toBeInTheDocument();
    expect(screen.queryByText("모집자와 협의")).not.toBeInTheDocument();
    expect(screen.queryByText("장소")).not.toBeInTheDocument();
    expect(screen.queryByText("온라인 또는 추후 안내")).not.toBeInTheDocument();
  });
  it("omits a synthetic place for online research and shows an actual offline research place", () => {
    const researchPost = { ...post, recruitment_type: "research_experiment" as const };
    const { rerender } = render(<InterviewContextBar room={{ ...room, interview_post: researchPost }} isOpen onToggle={vi.fn()} />);
    expect(screen.queryByText("장소")).not.toBeInTheDocument();

    rerender(<InterviewContextBar room={{ ...room, interview_post: { ...researchPost,
      interview_mode: "offline", location_place_name: "QA 연구실" } }} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText("장소")).toBeInTheDocument();
    expect(screen.getByText("QA 연구실")).toBeInTheDocument();
  });
  it("uses beta-specific labels in the wide context pane", () => {
    render(<InterviewContextPanel room={room} appUserId="owner" />);
    expect(screen.getByText("예상 참여 기간")).toBeInTheDocument();
    expect(screen.getByText("테스트 플랫폼")).toBeInTheDocument();
    expect(screen.getByText("2주")).toBeInTheDocument();
    expect(screen.getByText("iOS · Android")).toBeInTheDocument();
  });
  it.each(["beta_test", "survey", "research_experiment"] as const)("does not offer interview scheduling in a %s room", (type) => {
    render(<InterviewContextPanel room={{ ...room, interview_post: { ...post, recruitment_type: type } }} appUserId="owner" />);
    expect(screen.queryByRole("button", { name: "일정 확정하기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("omits unknown duration instead of showing zero minutes", () => {
    render(<InterviewContextPanel room={{ ...room, interview_post: { ...post, duration_value: null, duration_unit: null } }} appUserId="owner" />);
    expect(screen.queryByText("0분")).not.toBeInTheDocument();
    expect(screen.queryByText("예상 참여 기간")).not.toBeInTheDocument();
  });
  it("retains legacy interview time and availability", () => {
    render(<InterviewContextBar room={{ ...room, interview_post: { ...post, recruitment_type: undefined,
      duration_value: null, duration_unit: null, duration_minutes: 40, schedule_options: ["평일 저녁"] } }} isOpen onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("40분");
    expect(screen.getByRole("button")).toHaveTextContent("화상");
    expect(screen.getByText("가능 시간")).toBeInTheDocument();
    expect(screen.getByText("평일 저녁")).toBeInTheDocument();
  });
  it("links the owner to the current posting's applicant management", () => {
    render(<InterviewContextPanel room={{ ...room, interview_post: { ...post, recruitment_type: "interview" } }} appUserId="owner" />);
    expect(screen.getByRole("link", { name: "지원자 관리" })).toHaveAttribute("href", "/my-interviews?tab=posts&post=beta");
    expect(screen.queryByRole("button", { name: "일정 확정하기" })).not.toBeInTheDocument();
  });
  it("links the participant to the current application instead of promising schedule authority", () => {
    render(<InterviewContextPanel room={{ ...room, interview_post: { ...post, recruitment_type: undefined } }} appUserId="participant" />);
    expect(screen.getByRole("link", { name: "내 참여 보기" })).toHaveAttribute("href", "/my-interviews?tab=applications&application=application");
    expect(screen.queryByRole("button", { name: "일정 확정하기" })).not.toBeInTheDocument();
  });
  it.each([null, "outsider"])("does not offer a management link to an unknown member %s", (userId) => {
    render(<InterviewContextPanel room={{ ...room, interview_post: { ...post, recruitment_type: "interview" } }} appUserId={userId} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
