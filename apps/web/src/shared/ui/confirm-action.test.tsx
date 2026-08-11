import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmActionButton } from "./confirm-action";

afterEach(() => {
  document.body.style.pointerEvents = "";
});

describe("ConfirmActionButton", () => {
  it("opens the confirmation dialog from the trigger", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmActionButton
        description="이 지원자를 선정하면 일정 생성 단계로 이동합니다."
        onConfirm={vi.fn()}
        title="지원자를 선정할까요?"
      >
        선정
      </ConfirmActionButton>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "선정" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지원자를 선정할까요?" })).toBeInTheDocument();
    expect(screen.getByText("이 지원자를 선정하면 일정 생성 단계로 이동합니다.")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes without confirming when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmActionButton
        description="실제 불참이 맞는지 확인한 뒤 진행하세요."
        onConfirm={onConfirm}
        title="노쇼로 기록할까요?"
      >
        노쇼
      </ConfirmActionButton>,
    );

    await user.click(screen.getByRole("button", { name: "노쇼" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms once and closes the dialog", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmActionButton
        confirmLabel="완료"
        description="완료 기록으로 남습니다."
        onConfirm={onConfirm}
        title="인터뷰를 완료 처리할까요?"
      >
        완료 표시
      </ConfirmActionButton>,
    );

    await user.click(screen.getByRole("button", { name: "완료 표시" }));
    await user.click(screen.getByRole("button", { name: "완료" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when the trigger is disabled", async () => {
    render(
      <ConfirmActionButton
        disabled
        description="반려하면 상태 기록으로 남습니다."
        onConfirm={vi.fn()}
        title="지원자를 반려할까요?"
      >
        반려
      </ConfirmActionButton>,
    );

    expect(screen.getByRole("button", { name: "반려" })).toBeDisabled();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
