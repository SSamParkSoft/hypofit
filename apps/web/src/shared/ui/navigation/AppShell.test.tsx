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

  it("keeps the chat workspace fixed without a dashboard footer", () => {
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
    const topNavigation = container.querySelector(
      '[data-app-shell-region="top-navigation"]',
    ) as HTMLElement;
    const main = screen.getByRole("main");

    expect(shell.className).not.toContain("grid-cols");
    expect(shell.className).toContain(
      "min-[1200px]:grid-rows-[var(--app-desktop-header-height)_minmax(var(--app-shell-content-height),auto)]",
    );
    expect(
      Array.from(container.querySelectorAll("[data-app-shell-region]")).map(
        (element) => element.getAttribute("data-app-shell-region"),
      ),
    ).toEqual(["top-navigation", "main"]);

    expect(within(topNavigation).getByRole("link", { name: "Hypofit" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(topNavigation.className).toContain("sticky");
    expect(within(topNavigation).getByRole("link", { name: "알림" })).toHaveAttribute(
      "title",
      "알림",
    );
    expect(
      within(topNavigation).getByRole("button", { name: "계정 메뉴" }),
    ).toBeInTheDocument();
    expect(
      within(topNavigation).getByRole("navigation", {
        name: "Hypofit primary navigation",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-app-shell-region="desktop-rail"]')).toBeNull();

    expect(main).toHaveAttribute("id", "app-content");
    expect(main).toHaveTextContent("MockAppContent");
    expect(main.className).toContain("min-[1200px]:row-start-2");
    expect(main.className).toContain("min-[1200px]:overflow-hidden");
    expect(main.className).toContain(
      "min-[1200px]:h-[var(--app-shell-content-height)]",
    );
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
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

    const topNavigation = screen.getByRole("navigation", {
      name: "Hypofit primary navigation",
    });
    const activeItems = within(topNavigation).queryAllByRole("link", { current: "page" });

    expect(activeItems).toHaveLength(0);
    expect(screen.getByRole("main")).toHaveTextContent("MockUtilityContent");
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("keeps the current destination highlighted for normal app routes", () => {
    const { container } = render(
      <AppShell
        activeDestination="profile"
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockProfileContent</div>
      </AppShell>,
    );

    const topNavigation = screen.getByRole("navigation", {
      name: "Hypofit primary navigation",
    });

    expect(
      within(topNavigation).getByRole("link", { name: "프로필", current: "page" }),
    ).toBeInTheDocument();
    expect(within(topNavigation).queryAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("main").className).not.toContain("min-[1200px]:overflow-y-auto");
    expect(container.firstElementChild).toHaveClass(
      "min-[1200px]:grid-rows-[var(--app-desktop-header-height)_minmax(var(--app-shell-content-height),auto)]",
    );
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("keeps the fixed map workspace free of a dashboard footer", () => {
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
    expect(screen.getByRole("main").className).toContain("pb-0");
    expect(screen.getByRole("main").className).not.toContain(
      "pb-[var(--app-content-bottom-reserve)]",
    );
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("reserves the mobile bottom navigation for the document-scrolling home page", () => {
    render(
      <AppShell
        activeDestination="home"
        navItems={navItems}
        notificationButton={notificationButton}
        onNavigate={vi.fn()}
      >
        <div>MockHomeContent</div>
      </AppShell>,
    );

    const main = screen.getByRole("main");

    expect(main.className).toContain("pb-[var(--app-content-bottom-reserve)]");
    expect(main.className.split(" ")).not.toContain("pb-0");
  });
});
