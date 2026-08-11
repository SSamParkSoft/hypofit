import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { ProfileSettingsIndex } from "./ProfileSettingsIndex";

describe("ProfileSettingsIndex", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: "fallback@example.com" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps identity context separate from one row-based settings navigation", () => {
    render(
      <ProfileSettingsIndex
        appUser={{
          bio: "초기 고객 인터뷰를 준비하고 있어요.",
          email: "review@example.com",
          id: "user-1",
          name: "박세현",
          phone: null,
          profile_image_path: null,
          profile_image_url: null,
          role: "both",
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "설정" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "내 계정 요약" })).toHaveTextContent("박세현");
    expect(screen.getByRole("region", { name: "내 계정 요약" })).toHaveTextContent(
      "초기 고객 인터뷰를 준비하고 있어요.",
    );

    const settings = screen.getByRole("navigation", { name: "프로필 설정 목록" });
    expect(within(settings).getByRole("link", { name: /계정 정보/ })).toHaveAttribute(
      "href",
      "/profile/account",
    );
    expect(within(settings).getByRole("link", { name: /알림 설정/ })).toHaveAttribute(
      "href",
      "/profile/notifications",
    );
    expect(within(settings).queryByRole("link", { name: /위치 권한/ })).not.toBeInTheDocument();
    expect(within(settings).getByRole("link", { name: /문의하기/ })).toHaveAttribute(
      "href",
      "/support/inquiries",
    );
    expect(within(settings).getByRole("link", { name: /신고하기/ })).toHaveAttribute(
      "href",
      "/report",
    );
    expect(within(settings).queryByRole("link", { name: "이용약관" })).not.toBeInTheDocument();
    expect(
      within(settings).queryByRole("link", { name: "개인정보 처리방침" }),
    ).not.toBeInTheDocument();
    expect(within(settings).queryByText("로그아웃")).not.toBeInTheDocument();
    expect(within(settings).queryByText("계정 삭제")).not.toBeInTheDocument();
  });
});
