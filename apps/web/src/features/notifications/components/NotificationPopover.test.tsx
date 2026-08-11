import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationRecord } from "../../../shared/api/notifications";

const mocks = vi.hoisted(() => ({
  markAllRead: vi.fn(),
  markRead: vi.fn(),
  navigateTo: vi.fn(),
  refetch: vi.fn(),
  useNotifications: vi.fn(),
}));

vi.mock("../useNotifications", () => ({
  useMarkAllNotificationsRead: () => ({
    isPending: false,
    mutate: mocks.markAllRead,
  }),
  useMarkNotificationRead: () => ({ mutate: mocks.markRead }),
  useNotifications: (...args: unknown[]) => mocks.useNotifications(...args),
}));

vi.mock("../../../shared/navigation/appNavigation", () => ({
  navigateTo: mocks.navigateTo,
}));

import { NotificationPopover } from "./NotificationPopover";

const unreadNotification: NotificationRecord = {
  body: "지원자 정보를 확인해 보세요.",
  created_at: new Date().toISOString(),
  id: "notification-1",
  metadata: {},
  read_at: null,
  target_id: "application-1",
  target_type: "application",
  title: "새로운 인터뷰 신청이 도착했어요",
  type: "application_created",
  user_id: "user-1",
};

describe("NotificationPopover", () => {
  beforeEach(() => {
    mocks.useNotifications.mockReturnValue({
      data: [unreadNotification],
      isError: false,
      isLoading: false,
      refetch: mocks.refetch,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads recent notifications only after opening and navigates from an item", async () => {
    const user = userEvent.setup();
    render(
      <NotificationPopover
        accessToken="access-token"
        unreadCount={1}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "알림, 읽지 않은 알림 1개",
    });
    expect(mocks.useNotifications).toHaveBeenLastCalledWith(
      "access-token",
      { limit: 6 },
      { enabled: false },
    );

    await user.click(trigger);

    expect(await screen.findByRole("heading", { name: "알림" })).toBeInTheDocument();
    expect(screen.getByText("읽지 않은 알림 1개")).toBeInTheDocument();
    expect(mocks.useNotifications).toHaveBeenLastCalledWith(
      "access-token",
      { limit: 6 },
      { enabled: true },
    );

    await user.click(
      screen.getByRole("link", {
        name: /새로운 인터뷰 신청이 도착했어요/,
      }),
    );

    expect(mocks.markRead).toHaveBeenCalledWith("notification-1");
    expect(mocks.navigateTo).toHaveBeenCalledWith("/my-interviews");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "알림" })).not.toBeInTheDocument();
    });
  });

  it("supports marking all notifications read and opening the full notification center", async () => {
    const user = userEvent.setup();
    render(
      <NotificationPopover
        accessToken="access-token"
        unreadCount={2}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "알림, 읽지 않은 알림 2개",
      }),
    );
    await user.click(screen.getByRole("button", { name: "모두 읽음" }));
    expect(mocks.markAllRead).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("link", { name: "알림 전체 보기" }));
    expect(mocks.navigateTo).toHaveBeenCalledWith("/notifications");
  });

  it("renders a calm empty state without removing the full-page route", async () => {
    const user = userEvent.setup();
    mocks.useNotifications.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
      refetch: mocks.refetch,
    });

    render(
      <NotificationPopover
        accessToken="access-token"
        unreadCount={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "알림" }));

    expect(await screen.findByText("새 알림이 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "모두 읽음" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "알림 전체 보기" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("closes on Escape or outside interaction and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(
      <>
        <NotificationPopover
          accessToken="access-token"
          unreadCount={1}
        />
        <button type="button">바깥 작업</button>
      </>,
    );

    const trigger = screen.getByRole("button", {
      name: "알림, 읽지 않은 알림 1개",
    });
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "알림" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "알림" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "알림" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "바깥 작업" }));
    expect(screen.queryByRole("dialog", { name: "알림" })).not.toBeInTheDocument();
  });
});
