import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Application, InterviewPost, Session } from "../../../shared/api/types";
import type { MyInterviewApplicationRowModel } from "../types";
import { MyInterviewsApplicationListPane } from "./MyInterviewsApplicationListPane";

const application = {
  answers: {},
  available_times: ["평일 저녁"],
  id: "application-1",
  interview_post_id: "post-1",
  rejection_reason: null,
  respondent_id: "participant-1",
  status: "selected",
} as Application;
const session: Session = {
  id: "session-1", application_id: "application-1", scheduled_at: "2026-10-20T05:00:00Z",
  meeting_type: "online", meeting_url: null, place: null, status: "scheduled",
};

function row(title: string, type?: InterviewPost["recruitment_type"]): MyInterviewApplicationRowModel {
  return {
    application: { ...application, id: title },
    answerCount: 1,
    applicationLabel: title,
    availableTimeCount: 1,
    displayTitle: title,
    post: type ? { founder: null, recruitment_type: type } as InterviewPost : undefined,
    respondentLabel: "참가자",
    sessionTimeLabel: null,
    targetSummary: "참여 조건",
  };
}

afterEach(cleanup);

describe("MyInterviewsApplicationListPane", () => {
  it("keeps interview scheduling metadata out of survey, beta, and research rows", () => {
    render(<MyInterviewsApplicationListPane
      headingId="applications-heading"
      onSelectApplication={() => undefined}
      rows={[row("설문 신청", "survey"), row("베타 신청", "beta_test"), row("연구 신청", "research_experiment"), row("인터뷰 신청", "interview") ]}
      selectedApplicationId={null}
    />);

    for (const title of ["설문 신청", "베타 신청", "연구 신청"]) {
      const item = screen.getByRole("button", { name: new RegExp(title) });
      expect(within(item).queryByText("일정 대기")).not.toBeInTheDocument();
      expect(within(item).queryByText("가능 시간 1개")).not.toBeInTheDocument();
    }
    const interview = screen.getByRole("button", { name: /인터뷰 신청/ });
    expect(within(interview).getByText("일정 대기")).toBeInTheDocument();
    expect(within(interview).getByText("가능 시간 1개")).toBeInTheDocument();
  });

  it("does not infer interview timing from an unavailable post", () => {
    render(<MyInterviewsApplicationListPane
      headingId="applications-heading"
      onSelectApplication={() => undefined}
      rows={[row("공고 정보를 불러올 수 없음")]}
      selectedApplicationId={null}
    />);
    const item = screen.getByRole("button", { name: /공고 정보를 불러올 수 없음/ });
    expect(within(item).queryByText("일정 대기")).not.toBeInTheDocument();
    expect(within(item).queryByText("가능 시간 1개")).not.toBeInTheDocument();
  });

  it.each(["applied", "rejected", "canceled", "completed"] as const)(
    "does not show schedule pending for %s interview rows",
    (status) => {
      const interview = row(`${status} 인터뷰`, "interview");
      interview.application.status = status;
      render(<MyInterviewsApplicationListPane
        headingId="applications-heading"
        onSelectApplication={() => undefined}
        rows={[interview]}
        selectedApplicationId={null}
      />);
      expect(screen.queryByText("일정 대기")).not.toBeInTheDocument();
    },
  );

  it.each(["completed", "no_show"] as const)("shows one %s badge when session agrees", (status) => {
    const interview = row(`${status} 인터뷰`, "interview");
    interview.application.status = status;
    interview.session = { ...session, status };
    interview.sessionTimeLabel = "2026. 10. 20. 오후 2:00";
    render(<MyInterviewsApplicationListPane
      headingId="applications-heading"
      onSelectApplication={() => undefined}
      rows={[interview]}
      selectedApplicationId={null}
    />);
    const item = screen.getByRole("button", { name: new RegExp(`${status} 인터뷰`) });
    expect(within(item).getAllByText(status === "completed" ? "완료" : "노쇼")).toHaveLength(1);
  });
});
