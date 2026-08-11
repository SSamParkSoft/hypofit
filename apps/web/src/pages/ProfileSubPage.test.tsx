import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const mockNavigateBack = vi.fn();
const mockNavigateTo = vi.fn();
const mockUploadProfileImage = vi.fn();
const mockSignOut = vi.fn();
const mockSyncCurrentUser = vi.fn();
const mockUpdateCurrentUser = vi.fn();
const mockUseSocialAuthIdentities = vi.fn();
const mockUseSocialIdentityLinking = vi.fn();

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/auth/social/useSocialAuthIdentities", () => ({
  useSocialAuthIdentities: () => mockUseSocialAuthIdentities(),
}));

vi.mock("../features/auth/social/useSocialIdentityLinking", () => ({
  useSocialIdentityLinking: () => mockUseSocialIdentityLinking(),
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateBack: (...args: unknown[]) => mockNavigateBack(...args),
  navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
}));

vi.mock("../shared/supabase/profileImages", () => ({
  uploadProfileImage: (...args: unknown[]) => mockUploadProfileImage(...args),
}));

import { ProfileSubPage } from "./ProfileSubPage";

const appUser = {
  bio: "기존 소개",
  email: "review@example.com",
  id: "user-1",
  name: "박세현",
  phone: "010-1111-2222",
  profile_image_path: null,
  profile_image_url: null,
  role: "both" as const,
};

describe("ProfileSubPage", () => {
  beforeEach(() => {
    mockNavigateBack.mockReset();
    mockNavigateTo.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockSyncCurrentUser.mockResolvedValue(undefined);
    mockUpdateCurrentUser.mockResolvedValue(undefined);
    mockUploadProfileImage.mockResolvedValue({
      path: "profiles/user-1/avatar.png",
      publicUrl: "https://example.com/avatar.png",
    });
    mockUseSocialAuthIdentities.mockReturnValue({
      data: [
        {
          email: "review@example.com",
          linkedAt: "2026-07-20T10:00:00Z",
          provider: "google",
          providerIdentifier: "google",
          status: "active",
        },
        {
          email: null,
          linkedAt: "2026-07-20T10:00:00Z",
          provider: "naver",
          providerIdentifier: "custom:naver",
          status: "revocation_pending",
        },
      ],
      isError: false,
      isLoading: false,
    });
    mockUseSocialIdentityLinking.mockReturnValue({
      availableProviders: [],
      feedback: null,
      isLoading: false,
      linkProvider: vi.fn(),
      pendingProvider: null,
    });
    mockUseAuth.mockReturnValue({
      errorMessage: null,
      isSyncing: false,
      signOut: mockSignOut,
      syncCurrentUser: mockSyncCurrentUser,
      updateCurrentUser: mockUpdateCurrentUser,
      user: {
        app_metadata: { providers: ["email", "google", "custom:naver"] },
        email: "review@example.com",
        id: "user-1",
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits edited account information through the shared auth update flow", async () => {
    const user = userEvent.setup();

    render(<ProfileSubPage appUser={appUser} type="account" />);

    const profilePreview = screen.getByRole("region", { name: "공개 프로필 미리보기" });
    expect(within(profilePreview).getByText("박세현")).toBeInTheDocument();
    expect(within(profilePreview).getByText("기존 소개")).toBeInTheDocument();
    expect(within(profilePreview).getByText("창업자 · 인터뷰어")).toBeInTheDocument();
    expect(within(profilePreview).queryByText("review@example.com")).not.toBeInTheDocument();
    expect(within(profilePreview).queryByText("010-1111-2222")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "로그인 방법" })).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("네이버")).toBeInTheDocument();
    expect(screen.getByText("연결됨")).toBeInTheDocument();
    expect(screen.getByText("해제 진행 중")).toBeInTheDocument();
    expect(
      screen.getByText("연결 해제는 마지막 로그인 방법 보호와 공급자 해제 계약이 준비된 뒤 제공할게요."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /연결 해제/ })).not.toBeInTheDocument();

    const basicInfoSection = screen.getByRole("heading", { level: 2, name: "기본 정보" })
      .closest("section");
    expect(basicInfoSection).not.toBeNull();
    expect(within(basicInfoSection as HTMLElement).getByLabelText("프로필 사진 업로드")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "프로필 사진" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "수정하기" }));

    expect(screen.getByRole("heading", { level: 1, name: "기본 정보 수정" })).toBeInTheDocument();

    const nameInput = screen.getByLabelText("이름");
    const bioInput = screen.getByLabelText("한줄소개");
    const phoneInput = screen.getByLabelText("전화번호");

    await user.clear(nameInput);
    await user.type(nameInput, "  새로운 이름  ");
    await user.clear(bioInput);
    await user.type(bioInput, "  새로운 소개  ");
    await user.clear(phoneInput);
    await user.type(phoneInput, "821012345678");

    expect(phoneInput).toHaveValue("010-1234-5678");

    await user.click(screen.getByRole("button", { name: "저장하기" }));

    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
      bio: "새로운 소개",
      name: "새로운 이름",
      phone: "010-1234-5678",
      role: "both",
    });
    expect(await screen.findByText("계정 정보가 저장됐어요.")).toBeInTheDocument();
  });

  it("hides password-change entry while keeping success status and sign-out behavior on the account route", async () => {
    const user = userEvent.setup();

    render(<ProfileSubPage appUser={appUser} type="account" />);

    expect(screen.queryByRole("button", { name: /변경하기/ })).not.toBeInTheDocument();
    expect(screen.queryByText("소셜 로그인 계정에는 설정되지 않았어요")).not.toBeInTheDocument();
    expect(screen.queryByText("비밀번호")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /로그아웃/ }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("preserves the role settings surface and founder inquiry route", () => {
    render(<ProfileSubPage appUser={{ ...appUser, role: "respondent" }} type="role" />);

    expect(screen.getByRole("heading", { level: 1, name: "역할 설정" })).toBeInTheDocument();
    expect(screen.getByText("모집글 만들기")).toBeInTheDocument();
    expect(screen.getByText("꺼짐")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /역할 변경 문의/ })).toHaveAttribute("href", "/support/inquiries");
  });

  it("keeps notification and delete-account action routing intact", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProfileSubPage appUser={appUser} type="notifications" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "알림 보기" }));
    expect(mockNavigateTo).toHaveBeenCalledWith("/notifications");

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProfileSubPage appUser={appUser} type="delete-account" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "삭제 요청" }));
    expect(mockNavigateTo).toHaveBeenCalledWith("/account-deletion");
    expect(screen.getByRole("link", { name: /계정 삭제 접수하기/ })).toHaveAttribute("href", "/account-deletion");
    expect(screen.getByRole("link", { name: /앱 밖에서 삭제 요청하기/ })).toHaveAttribute("href", "/account-deletion");
  });

});
