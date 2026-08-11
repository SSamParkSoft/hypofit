import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_BOOTSTRAP_STATUS_DELAY_MS,
  AUTH_BOOTSTRAP_TIMEOUT_MS,
} from "./authEntryState";
import { AuthBootstrapGate } from "./AuthBootstrapGate";

describe("AuthBootstrapGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("keeps the shell static first, then announces delayed auth without fake progress", () => {
    render(
      <AuthBootstrapGate
        isChecking
        isOnline
        onGoToLanding={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(AUTH_BOOTSTRAP_STATUS_DELAY_MS);
    });

    expect(screen.getByRole("status")).toHaveTextContent("계정을 확인하고 있어요");
  });

  it("shows recovery actions after the timeout", () => {
    const onRetry = vi.fn();
    const onGoToLanding = vi.fn();

    render(
      <AuthBootstrapGate
        isChecking
        isOnline
        onGoToLanding={onGoToLanding}
        onRetry={onRetry}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(AUTH_BOOTSTRAP_TIMEOUT_MS);
    });

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("alert")).toHaveTextContent("로그인 상태를 확인하지 못했어요");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    fireEvent.click(screen.getByRole("button", { name: "랜딩으로" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onGoToLanding).toHaveBeenCalledTimes(1);
  });

  it("shows the offline recovery state immediately", () => {
    render(
      <AuthBootstrapGate
        isChecking={false}
        isOnline={false}
        onGoToLanding={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("인터넷 연결을 확인해 주세요");
    expect(within(alert).queryByRole("button", { name: "랜딩으로" })).not.toBeInTheDocument();
  });

  it("restarts bootstrap timing after the browser comes back online", () => {
    const props = {
      isChecking: true,
      onGoToLanding: vi.fn(),
      onRetry: vi.fn(),
    };
    const view = render(<AuthBootstrapGate {...props} isOnline={false} />);

    act(() => {
      vi.advanceTimersByTime(AUTH_BOOTSTRAP_TIMEOUT_MS);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("인터넷 연결을 확인해 주세요");

    view.rerender(<AuthBootstrapGate {...props} isOnline />);

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
