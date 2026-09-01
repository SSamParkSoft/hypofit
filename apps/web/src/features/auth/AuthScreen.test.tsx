import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authState: {
    appUser: null as null | { email?: string; name?: string; profile_image_url?: string | null },
    completeRoleOnboarding: vi.fn(),
    requiresRoleOnboarding: false,
    session: null as { user: { email?: string; user_metadata?: Record<string, unknown> } } | null,
    signOut: vi.fn(),
  },
  replacePath: vi.fn(),
  socialEntry: {
    feedback: null as { message: string; tone: "error" | "success" } | null,
    pendingProviderId: null as "apple" | "google" | "kakao" | "naver" | null,
    providers: [] as Array<{
      provider: "apple" | "google" | "kakao" | "naver";
      providerIdentifier: "apple" | "google" | "kakao" | "custom:naver";
    }>,
    startSocialAuth: vi.fn(),
  },
}));

vi.mock("../../shared/navigation/appNavigation", () => ({
  replacePath: mocks.replacePath,
}));

vi.mock("./useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("./social/useSocialAuthEntry", () => ({
  useSocialAuthEntry: () => mocks.socialEntry,
}));

import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/app");
    mocks.authState.completeRoleOnboarding.mockReset();
    mocks.authState.completeRoleOnboarding.mockResolvedValue(undefined);
    mocks.authState.signOut.mockReset();
    mocks.authState.signOut.mockResolvedValue(undefined);
    mocks.authState.appUser = null;
    mocks.authState.requiresRoleOnboarding = false;
    mocks.authState.session = null;
    mocks.replacePath.mockReset();
    mocks.socialEntry.startSocialAuth.mockReset();
    mocks.socialEntry.feedback = null;
    mocks.socialEntry.pendingProviderId = null;
    mocks.socialEntry.providers = [
      {
        provider: "kakao",
        providerIdentifier: "kakao",
      },
      {
        provider: "apple",
        providerIdentifier: "apple",
      },
      {
        provider: "google",
        providerIdentifier: "google",
      },
      {
        provider: "naver",
        providerIdentifier: "custom:naver",
      },
    ];
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the approved social-only public auth entry", () => {
    render(<AuthScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "로그인" })).toBeInTheDocument();
    expect(screen.getByText("사용 중인 소셜 계정으로 바로 시작할 수 있어요.")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "카카오 로그인",
      "Apple로 로그인",
      "Google로 로그인",
      "네이버로 로그인",
    ]);
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "회원가입" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "비밀번호 찾기" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.getByRole("link", { name: "고객센터" })).toHaveAttribute("href", "/support");
    expect(screen.getByText("© 2026 contentruck")).toBeInTheDocument();
  });

  it("starts each configured social auth method from the public entry", async () => {
    const user = userEvent.setup();

    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: "카카오 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("kakao", "sign_in");

    await user.click(screen.getByRole("button", { name: "Apple로 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("apple", "sign_in");

    await user.click(screen.getByRole("button", { name: "Google로 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("google", "sign_in");

    await user.click(screen.getByRole("button", { name: "네이버로 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("naver", "sign_in");
  });

  it("lets an existing session continue or switch to another account", async () => {
    const user = userEvent.setup();
    mocks.authState.appUser = {
      email: "sehyeon@example.com",
      name: "박세현",
      profile_image_url: null,
    };
    mocks.authState.session = {
      user: {
        email: "sehyeon@example.com",
        user_metadata: { name: "박세현" },
      },
    };

    render(<AuthScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "계정을 선택해 주세요" })).toBeInTheDocument();
    expect(screen.getByText("sehyeon@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "박세현 계정으로 계속" }));
    expect(mocks.replacePath).toHaveBeenCalledWith("/app", { intent: "auth" });

    await user.click(screen.getByRole("button", { name: "다른 계정으로 로그인" }));
    expect(mocks.authState.signOut).toHaveBeenCalledTimes(1);
  });

  it("requires the age and legal consent before account completion", async () => {
    const user = userEvent.setup();
    mocks.authState.requiresRoleOnboarding = true;
    mocks.authState.session = {
      user: {
        email: "new@example.com",
        user_metadata: { name: "박세현" },
      },
    };

    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "만 19세 이상이며 약관에 동의해야 가입할 수 있어요.",
    );
    expect(mocks.authState.completeRoleOnboarding).not.toHaveBeenCalled();
  });

  it("returns to the protected deep link after legal consent completion", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/chat?room=room-123");
    mocks.authState.requiresRoleOnboarding = true;
    mocks.authState.session = {
      user: {
        email: "new@example.com",
        user_metadata: { name: "박세현" },
      },
    };

    render(<AuthScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "가입을 완료해 주세요" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /만 19세 이상/ }));
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() =>
      expect(mocks.authState.completeRoleOnboarding).toHaveBeenCalledWith({ role: "both" }),
    );
    expect(mocks.replacePath).toHaveBeenCalledWith("/chat?room=room-123", {
      intent: "auth",
    });
  });

  it("keeps legal-document links outside the consent labels during account completion", () => {
    mocks.authState.requiresRoleOnboarding = true;
    mocks.authState.session = {
      user: {
        email: "new@example.com",
        user_metadata: { name: "박세현" },
      },
    };

    render(<AuthScreen />);

    expect(
      screen.getAllByRole("link", { name: "이용약관" }).every((link) => !link.closest("label")),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "개인정보처리방침" })
        .every((link) => !link.closest("label")),
    ).toBe(true);
  });
});
