import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  NotificationButton,
  NotificationButtonStateProvider,
  NotificationTriggerButton,
} from "./notification-button";

describe("NotificationButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("announces the unread count and exposes a native tooltip when explicit props are provided", () => {
    render(<NotificationButton scope="shell" unreadCount={3} />);

    const link = screen.getByRole("link", { name: "알림, 읽지 않은 알림 3개" });
    expect(link).toHaveAttribute("href", "/notifications");
    expect(link).toHaveAttribute("title", "알림");
    expect(link.className).toContain("size-10");
    expect(link.className).toContain("md:grid");
    expect(link.querySelector('[data-unread-indicator="true"]')).not.toBeNull();
  });

  it("inherits unread state from shell composition without importing feature hooks", () => {
    render(
      <NotificationButtonStateProvider value={{ hasUnread: true, unreadCount: 2 }}>
        <NotificationButton scope="shell" />
      </NotificationButtonStateProvider>,
    );

    const link = screen.getByRole("link", { name: "알림, 읽지 않은 알림 2개" });
    expect(link.querySelector('[data-unread-indicator="true"]')).not.toBeNull();
  });

  it("keeps the same footprint and hides the unread indicator when no state is available", () => {
    const { rerender } = render(<NotificationButton scope="shell" />);
    let link = screen.getByRole("link", { name: "알림" });
    const loadingClassName = link.className;

    expect(link).toHaveAttribute("title", "알림");
    expect(link.querySelector('[data-unread-indicator="true"]')).toBeNull();

    rerender(
      <NotificationButtonStateProvider value={{ hasUnread: false, unreadCount: null }}>
        <NotificationButton scope="shell" />
      </NotificationButtonStateProvider>,
    );

    link = screen.getByRole("link", { name: "알림" });
    expect(link.className).toBe(loadingClassName);
    expect(link.querySelector('[data-unread-indicator="true"]')).toBeNull();
  });

  it("preserves the compact page-level rendering mode outside the shell utility", () => {
    render(<NotificationButton hasUnread={false} />);

    const link = screen.getByRole("link", { name: "알림" });
    expect(link.className).toContain("size-11");
    expect(link.className).toContain("md:hidden");
  });

  it("provides a button trigger with the same unread state for shell popovers", () => {
    render(
      <NotificationTriggerButton
        aria-expanded="false"
        scope="shell"
        unreadCount={20}
        unreadCountCapped
      />,
    );

    const button = screen.getByRole("button", {
      name: "알림, 읽지 않은 알림 20개 이상",
    });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.className).toContain("size-10");
    expect(button.querySelector('[data-unread-indicator="true"]')).not.toBeNull();
  });
});
