import { cleanup, render, screen } from "@testing-library/react";
import type { InterviewPost } from "@hypofit/contracts";
import type { Session } from "../../../shared/api/types";
import { afterEach, describe, expect, it } from "vitest";

import type { ApplicationReadModel } from "../../workflow/readModels";
import { ApplicationCard } from "./ApplicationCard";

const post: InterviewPost = {
  id: "post-1", founder_id: "owner", title: "QA posting", service_summary: "Summary",
  target_description: "Participants", status: "open", recruitment_type: "interview",
  schedule_options: [], duration_minutes: 30, interview_mode: "online",
  reward_amount: 0, recruit_count: 2,
  location: null, location_text: null, location_address: null, location_place_name: null,
  location_latitude: null, location_longitude: null, location_precision: null, location_source: null,
  distance_meters: null,
};
const model: ApplicationReadModel = {
  application: {
    id: "application-1", interview_post_id: post.id, respondent_id: "participant",
    answers: { relevant_experience: "Experience" }, available_times: ["평일 저녁"],
    status: "selected", rejection_reason: null,
  },
  answerCount: 1, applicationLabel: "지원", availableTimeCount: 1,
  displayTitle: post.title, post, respondentLabel: "참여자",
  sessionTimeLabel: null, targetSummary: post.target_description,
};
const session: Session = {
  id: "session-1", application_id: "application-1", scheduled_at: "2026-10-20T05:00:00Z",
  meeting_type: "online", meeting_url: null, place: null, status: "scheduled",
};

afterEach(cleanup);

describe("ApplicationCard schedule metadata", () => {
  it.each(["interview", undefined] as const)("retains pending schedule for interview type %s", (type) => {
    render(<ApplicationCard model={{ ...model, post: { ...post, recruitment_type: type } }} />);
    expect(screen.getByText("일정 대기")).toBeInTheDocument();
  });

  it("retains a confirmed interview schedule", () => {
    render(<ApplicationCard model={{ ...model, sessionTimeLabel: "2026. 10. 20. 오후 2:00" }} />);
    expect(screen.getByText("2026. 10. 20. 오후 2:00")).toBeInTheDocument();
    expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
  });

  it.each(["applied", "rejected", "canceled", "completed"] as const)(
    "does not show schedule pending after status %s",
    (status) => {
      render(<ApplicationCard model={{ ...model, application: { ...model.application, status } }} />);
      expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
    },
  );

  it.each(["completed", "no_show"] as const)("shows only one %s state badge", (status) => {
    render(<ApplicationCard model={{
      ...model,
      application: { ...model.application, status },
      session: { ...session, status },
      sessionTimeLabel: "2026. 10. 20. 오후 2:00",
    }} />);
    expect(screen.getAllByText(status === "completed" ? "완료" : "노쇼")).toHaveLength(1);
  });

  it.each(["survey", "beta_test", "research_experiment"] as const)("omits pending schedule for %s", (type) => {
    render(<ApplicationCard model={{ ...model, post: { ...post, recruitment_type: type } }} />);
    expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
    expect(screen.getByText("답변 1개")).toBeInTheDocument();
    expect(screen.getByText("가능 시간 1개")).toBeInTheDocument();
  });

  it("does not infer an interview while the posting is unavailable", () => {
    render(<ApplicationCard model={{ ...model, post: undefined }} />);
    expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
  });

  it("keeps a saved session time when the posting is unavailable", () => {
    render(<ApplicationCard model={{ ...model, post: undefined, sessionTimeLabel: "2026. 10. 20. 오후 2:00" }} />);
    expect(screen.getByText("2026. 10. 20. 오후 2:00")).toBeInTheDocument();
    expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
  });
});
