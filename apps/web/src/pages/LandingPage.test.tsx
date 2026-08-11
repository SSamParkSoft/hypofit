import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APP_STORE_URL } from "../features/landing/content";
import { LandingPage } from "./LandingPage";

function mockViewport(isCompactWeb: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === "(min-width: 768px)" ? isCompactWeb : false,
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
  it("communicates the core interview workflow without unsupported claims", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Hypofit" })).toBeInTheDocument();
    expect(screen.getByText(/검증 인터뷰를 시작하세요/)).toBeInTheDocument();
    expect(screen.getByText(/신청 전 확인부터 문제 해결까지/)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("links to the live App Store listing and public legal routes", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/app");
    expect(screen.getAllByRole("link", { name: /App Store/ })[0]).toHaveAttribute(
      "href",
      APP_STORE_URL,
    );
    expect(screen.getAllByRole("link", { name: "개인정보처리방침" })[0]).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.getAllByRole("link", { name: "계정 삭제" })[0]).toHaveAttribute(
      "href",
      "/account-deletion",
    );
  });

  it("switches the mobile audience content without duplicating both role descriptions", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(screen.getByText("내 서비스에 맞는 고객을 만나요")).toBeInTheDocument();
    expect(screen.queryByText("내 경험에 맞는 인터뷰를 찾아요")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "인터뷰어" }));

    expect(screen.getByText("내 경험에 맞는 인터뷰를 찾아요")).toBeInTheDocument();
    expect(screen.queryByText("내 서비스에 맞는 고객을 만나요")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation between mobile audience tabs", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    const founderTab = screen.getByRole("tab", { name: "창업자" });
    founderTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "인터뷰어" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("내 경험에 맞는 인터뷰를 찾아요");
  });

  it("renders only the compact web composition from the 768px breakpoint", () => {
    mockViewport(true);

    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Hypofit" })).toBeInTheDocument();
    expect(screen.getByText(/실제 타깃 고객과의/)).toBeInTheDocument();
    expect(screen.getByText(/신고·차단·문의 기능을 이용할 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "창업자" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("connects every desktop header item to an existing landing section", () => {
    mockViewport(true);
    render(<LandingPage />);

    for (const [label, id] of [
      ["누구를 위한 서비스인가요", "for-who"],
      ["이용 흐름", "workflow"],
      ["주요 기능", "product"],
      ["안심하고 사용하세요", "trust"],
    ] as const) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `#${id}`);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
