import { cleanup, render, screen, within } from "@testing-library/react";
import {
  ClipboardList,
  House,
  Map,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppShellNavItem } from "./types";
import { AppShell } from "./AppShell";

const navItems: AppShellNavItem[] = [
  { href: "/app", icon: House, id: "home", label: "홈" },
  { href: "/interviews", icon: ClipboardList, id: "interviews", label: "인터뷰" },
  { href: "/map", icon: Map, id: "map", label: "지도" },
  { href: "/chat", icon: MessageCircle, id: "chat", label: "채팅" },
  { href: "/profile", icon: UserRound, id: "profile", label: "프로필" },
];

const notificationButton = (
  <a aria-label="알림" href="/notifications" title="알림">
    알림
  </a>
);

const accountMenu = <button type="button">계정 메뉴</button>;

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the desktop two-row shell and keeps notifications out of the rail", () => {
    const { container } = render(
      <AppShell
        accountMenu={accountMenu}
        activeDestination="chat"
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockAppContent</div>
      </AppShell>,
    );

    const shell = container.firstElementChild as HTMLElement;
    const brandHeader = container.querySelector(
      '[data-app-shell-region="desktop-brand-header"]',
    ) as HTMLElement;
    const utilityBar = container.querySelector(
      '[data-app-shell-region="desktop-utility-bar"]',
    ) as HTMLElement;
    const rail = container.querySelector(
      '[data-app-shell-region="desktop-rail"]',
    ) as HTMLElement;
    const main = screen.getByRole("main");

    expect(shell.className).toContain(
      "min-[1200px]:grid-cols-[var(--app-rail-width)_minmax(0,1fr)]",
    );
    expect(shell.className).toContain(
      "min-[1200px]:grid-rows-[var(--app-desktop-header-height)_minmax(0,1fr)]",
    );
    expect(
      Array.from(container.querySelectorAll("[data-app-shell-region]")).map(
        (element) => element.getAttribute("data-app-shell-region"),
      ),
    ).toEqual(["desktop-brand-header", "desktop-utility-bar", "desktop-rail", "main"]);

    expect(within(brandHeader).getByRole("link", { name: "Hypofit" })).toHaveAttribute(
      "href",
      "/app",
    );

    expect(within(utilityBar).getByRole("link", { name: "알림" })).toHaveAttribute(
      "title",
      "알림",
    );
    expect(within(utilityBar).getByRole("button", { name: "계정 메뉴" })).toBeInTheDocument();
    expect(utilityBar.className).toContain("z-50");
    expect(utilityBar.className).toContain("overflow-visible");
    expect(
      within(rail).getByRole("navigation", { name: "Hypofit primary navigation" }),
    ).toBeInTheDocument();
    expect(within(rail).queryByRole("link", { name: "Hypofit" })).not.toBeInTheDocument();
    expect(within(rail).queryByTitle("알림")).not.toBeInTheDocument();
    expect(within(rail).queryByText("새 소식을 확인해요")).not.toBeInTheDocument();

    expect(main).toHaveAttribute("id", "app-content");
    expect(main).toHaveTextContent("MockAppContent");
    expect(main.className).toContain("min-[1200px]:row-start-2");
    expect(main.className).toContain("min-[1200px]:overflow-hidden");
    expect(
      within(main).queryByText("© 2026 contentruck. All rights reserved."),
    ).not.toBeInTheDocument();
  });

  it("allows utility routes to render the shell with no active primary destination", () => {
    render(
      <AppShell
        activeDestination={null}
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockUtilityContent</div>
      </AppShell>,
    );

    const rail = screen.getByRole("navigation", { name: "Hypofit primary navigation" });
    const activeItems = within(rail).queryAllByRole("link", { current: "page" });

    expect(activeItems).toHaveLength(0);
    expect(screen.getByRole("main")).toHaveTextContent("MockUtilityContent");
    expect(screen.getByText("© 2026 contentruck. All rights reserved.")).toBeInTheDocument();
  });

  it("keeps the current destination highlighted for normal app routes", () => {
    render(
      <AppShell
        activeDestination="profile"
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockProfileContent</div>
      </AppShell>,
    );

    const rail = screen.getByRole("navigation", { name: "Hypofit primary navigation" });

    expect(
      within(rail).getByRole("link", { name: "프로필", current: "page" }),
    ).toBeInTheDocument();
    expect(within(rail).queryAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("main").className).toContain("min-[1200px]:overflow-y-auto");
    expect(screen.getByText("© 2026 contentruck. All rights reserved.")).toBeInTheDocument();
  });

  it("keeps the map workspace free of the desktop utility footer", () => {
    render(
      <AppShell
        activeDestination="map"
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockMapContent</div>
      </AppShell>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("MockMapContent");
    expect(screen.getByRole("main").className).toContain("min-[1200px]:overflow-hidden");
    expect(screen.getByRole("main").className).not.toContain(
      "min-[1200px]:overflow-y-auto",
    );
    expect(
      screen.queryByText("© 2026 contentruck. All rights reserved."),
    ).not.toBeInTheDocument();
  });
});
