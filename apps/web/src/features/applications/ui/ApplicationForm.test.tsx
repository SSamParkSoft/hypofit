import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationForm } from "./ApplicationForm";
import { useApplicationFormController } from "./useApplicationFormController";

function ControlledApplicationForm({
  interviewPostId = "post-1",
  onApply = vi.fn(),
}: {
  interviewPostId?: string;
  onApply?: (input: {
    answers?: Record<string, string>;
    available_times?: string[];
    interview_post_id: string;
  }) => void;
}) {
  const form = useApplicationFormController({
    interviewPostId,
    onApply,
  });

  return (
    <ApplicationForm
      availableTimes={form.availableTimes}
      availableTimesPlaceholder="예: 평일 20시 이후"
      cancelLabel="취소"
      errors={form.errors}
      experienceAnswer={form.experienceAnswer}
      experiencePlaceholder="조건과 맞는 경험을 적어주세요."
      onAvailableTimesChange={form.setAvailableTimes}
      onCancel={form.close}
      onExperienceAnswerChange={form.setExperienceAnswer}
      onSubmit={form.submit}
      submitLabel="신청 제출"
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("ApplicationForm", () => {
  it("shows field-level validation errors", async () => {
    const user = userEvent.setup();

    render(<ControlledApplicationForm />);

    await user.click(screen.getByRole("button", { name: "신청 제출" }));

    expect(screen.getByText("이 인터뷰 조건과 맞는 관련 경험을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("참여 가능한 시간을 한 개 이상 입력하세요.")).toBeInTheDocument();
  });

  it("submits normalized application input through the shared controller", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<ControlledApplicationForm onApply={onApply} />);

    await user.type(screen.getByLabelText("관련 경험"), " 최근 창업자 인터뷰에 참여한 경험이 있어요. ");
    await user.type(screen.getByLabelText("가능 시간"), "평일 저녁{enter}{enter} 토요일 오전 ");
    await user.click(screen.getByRole("button", { name: "신청 제출" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      interview_post_id: "post-1",
      answers: {
        relevant_experience: "최근 창업자 인터뷰에 참여한 경험이 있어요.",
      },
      available_times: ["평일 저녁", "토요일 오전"],
    });
  });
});
