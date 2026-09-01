import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APP_STORE_URL } from "../features/landing/content";
import { LandingPage } from "./LandingPage";

function mockViewport(isDesktopLanding: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === "(min-width: 768px)" ? isDesktopLanding : false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => mockViewport(false));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LandingPage", () => {
  it("communicates the public product promise and the two-sided platform", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /필요한 사람을 만나,답을 더 빠르게확인하세요/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/하나의 Hypofit, 필요할 때 모집하고 참여하세요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("offers the released App Store badge on mobile without exposing web login or dashboard entry", () => {
    render(<LandingPage isAuthenticated showWebEntry />);

    expect(
      screen.queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "대시보드로 이동" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "웹에서 열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /App Store/ })[0],
    ).toHaveAttribute("href", APP_STORE_URL);
    expect(
      screen.queryByRole("link", { name: /Google Play/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "개인정보처리방침" })[0],
    ).toHaveAttribute("href", "/legal/privacy");
    expect(
      screen.getAllByRole("link", { name: "계정 삭제" })[0],
    ).toHaveAttribute("href", "/account-deletion");
  });

  it("renders both audience groups as separate mobile sections instead of tabs or carousel controls", () => {
    render(<LandingPage />);

    expect(
      screen.getByText("필요한 경험과 조건을 갖춘 참여자를 모집하세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("내 경험에 맞는 참여 기회를 찾아보세요"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "모집자" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "참여자" }),
    ).not.toBeInTheDocument();
  });

  it("renders the desktop landing from 768px with web entry when allowed", () => {
    mockViewport(true);

    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/app",
    );
    const webStartLinks = screen.getAllByRole("link", {
      name: "웹에서 이용하기",
    });
    expect(webStartLinks).toHaveLength(2);
    webStartLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/app");
    });
    cleanup();
    render(<LandingPage isAuthenticated />);
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(
      screen.getByText(/내 공고와 참여 상황, 다음 할 일을 한눈에 확인하세요/),
    ).toBeInTheDocument();
    expect(screen.getAllByAltText(/Hypofit 앱/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /iPhone에서 이용할 수 있으며 Android 앱은 출시를 준비하고 있어요/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/대표 박종인/)).not.toBeInTheDocument();
    expect(screen.queryByText(/614-87-03791/)).not.toBeInTheDocument();
    expect(screen.queryByText(/한양대학로 55/)).not.toBeInTheDocument();
  });

  it("hides all web login and dashboard links on the outreach landing variant", () => {
    mockViewport(true);

    render(<LandingPage isAuthenticated showWebEntry={false} />);

    expect(
      screen.queryByRole("link", { name: "웹에서 이용하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "대시보드로 이동" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "웹에서 열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "대시보드 열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /App Store/ })[0],
    ).toHaveAttribute("href", APP_STORE_URL);
  });

  it("does not present unapproved pricing as purchasable plans", () => {
    render(<LandingPage />);

    expect(screen.queryByText("요금 공개 전")).not.toBeInTheDocument();
    expect(screen.queryByText("반복 운영")).not.toBeInTheDocument();
  });

  it("keeps the desktop header focused on account and app-download actions", () => {
    mockViewport(true);

    render(<LandingPage />);

    expect(
      screen.queryByRole("navigation", { name: "랜딩페이지 주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(screen.getByRole("link", { name: "앱 다운로드" })).toHaveAttribute(
      "href",
      "#download",
    );
  });
});
