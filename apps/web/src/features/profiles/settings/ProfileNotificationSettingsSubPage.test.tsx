import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refetch: vi.fn(),
  reset: vi.fn(),
  useNotificationPreferences: vi.fn(),
  useUpdateNotificationPreferences: vi.fn(),
}));

vi.mock("../../notifications", () => ({
  useNotificationPreferences: mocks.useNotificationPreferences,
  useUpdateNotificationPreferences: mocks.useUpdateNotificationPreferences,
}));

import { ProfileNotificationSettingsSubPage } from "./ProfileNotificationSettingsSubPage";

describe("ProfileNotificationSettingsSubPage", () => {
  beforeEach(() => {
    mocks.useNotificationPreferences.mockReturnValue({
      data: {
        application_push_enabled: true,
        chat_push_enabled: true,
        marketing_push_enabled: false,
        push_enabled: true,
        session_push_enabled: true,
        support_push_enabled: true,
      },
      error: null,
      isError: false,
      isPending: false,
      refetch: mocks.refetch,
    });
    mocks.useUpdateNotificationPreferences.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutate: mocks.mutate,
      reset: mocks.reset,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows app-scoped notification switches without requesting browser permission", () => {
    render(<ProfileNotificationSettingsSubPage />);

    expect(screen.getByRole("switch", { name: "Hypofit 앱 알림" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "채팅 메시지" })).toBeChecked();
    expect(screen.getByText(/브라우저 알림 권한은 요청하지 않아요/)).toBeInTheDocument();
  });

  it("patches the selected preference", async () => {
    const user = userEvent.setup();
    render(<ProfileNotificationSettingsSubPage />);

    await user.click(screen.getByRole("switch", { name: "채팅 메시지" }));

    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith({ chat_push_enabled: false });
  });

  it("disables category switches while the app master preference is off", () => {
    mocks.useNotificationPreferences.mockReturnValue({
      data: {
        application_push_enabled: true,
        chat_push_enabled: true,
        marketing_push_enabled: false,
        push_enabled: false,
        session_push_enabled: true,
        support_push_enabled: true,
      },
      error: null,
      isError: false,
      isPending: false,
      refetch: mocks.refetch,
    });

    render(<ProfileNotificationSettingsSubPage />);

    expect(screen.getByRole("switch", { name: "Hypofit 앱 알림" })).toBeEnabled();
    expect(screen.getByRole("switch", { name: "채팅 메시지" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "신청 상태" })).toBeDisabled();
  });

  it("offers a retry when preferences cannot be loaded", async () => {
    const user = userEvent.setup();
    mocks.useNotificationPreferences.mockReturnValue({
      data: undefined,
      error: new Error("network unavailable"),
      isError: true,
      isPending: false,
      refetch: mocks.refetch,
    });

    render(<ProfileNotificationSettingsSubPage />);
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(screen.getByText("알림 설정을 불러오지 못했어요.")).toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
