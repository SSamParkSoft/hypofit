import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const mockUseProfileWorkspace = vi.fn();
const mockSignOutToLanding = vi.fn();

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/auth/useSignOutToLanding", () => ({
  useSignOutToLanding: () => mockSignOutToLanding,
}));

vi.mock("../features/profiles/useProfileWorkspace", () => ({
  useProfileWorkspace: (...args: unknown[]) => mockUseProfileWorkspace(...args),
}));

import { ProfileSettingsIndex } from "./ProfileSettingsIndex";

describe("ProfileSettingsIndex", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: "fallback@example.com" },
    });
    mockUseProfileWorkspace.mockReturnValue({
      applications: [{ id: "application-1" }],
      canCreatePosts: true,
      chatRooms: [{ id: "room-1" }, { id: "room-2" }],
      errorMessage: null,
      handleProfileImageSelected: vi.fn(),
      interviewPosts: [{ id: "post-1" }],
      isActivityLoading: false,
      isSyncing: false,
      isUploadingImage: false,
      statusMessage: null,
      user: { email: "review@example.com", id: "user-1" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps identity separate from desktop activity and management rows", () => {
    render(
      <ProfileSettingsIndex
        appUser={{
          bio: "초기 고객 인터뷰를 준비하고 있어요.",
          email: "review@example.com",
          id: "user-1",
          name: "박세현",
          organization_name: null,
          organization_type: null,
          phone: null,
          profile_image_path: null,
          profile_image_url: null,
          role: "both",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "프로필" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "내 계정 요약" }),
    ).toHaveTextContent("박세현");
    expect(
      screen.getByRole("region", { name: "내 계정 요약" }),
    ).toHaveTextContent("초기 고객 인터뷰를 준비하고 있어요.");
    expect(screen.getByRole("link", { name: "프로필 편집" })).toHaveAttribute(
      "href",
      "/profile/account",
    );

    expect(screen.getByRole("link", { name: /프로필 편집/ })).toHaveAttribute(
      "href",
      "/profile/account",
    );
    expect(
      screen.getByRole("link", { name: /신청한 인터뷰/ }),
    ).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /내 모집글/ })).toHaveTextContent(
      "1",
    );
    expect(screen.getByRole("link", { name: /채팅/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /계정 정보/ })).toHaveAttribute(
      "href",
      "/profile/account",
    );
    expect(screen.getByRole("link", { name: /알림 설정/ })).toHaveAttribute(
      "href",
      "/profile/notifications",
    );
    expect(screen.getByRole("link", { name: /문의하기/ })).toHaveAttribute(
      "href",
      "/support/inquiries",
    );
    expect(screen.getByRole("link", { name: /신고하기/ })).toHaveAttribute(
      "href",
      "/report",
    );
    expect(
      screen.getByRole("link", { name: /개인정보처리방침/ }),
    ).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: /이용약관/ })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(
      screen.getByRole("button", { name: /로그아웃/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /계정 삭제/ })).toHaveAttribute(
      "href",
      "/profile/delete-account",
    );
  });
});
