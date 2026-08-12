import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authState: {
    completeRoleOnboarding: vi.fn(),
    requiresRoleOnboarding: false,
    session: null as { user: { email?: string; user_metadata?: Record<string, unknown> } } | null,
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
      "Apple로 계속하기",
      "Google로 계속하기",
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
  });

  it("starts each configured social auth method from the public entry", async () => {
    const user = userEvent.setup();

    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: "카카오 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("kakao", "sign_in");

    await user.click(screen.getByRole("button", { name: "Apple로 계속하기" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("apple", "sign_in");

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("google", "sign_in");

    await user.click(screen.getByRole("button", { name: "네이버로 로그인" }));
    expect(mocks.socialEntry.startSocialAuth).toHaveBeenCalledWith("naver", "sign_in");
  });

  it("requires the age and legal consent before role completion", async () => {
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

  it("returns to the protected deep link after role onboarding", async () => {
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

    await user.click(screen.getByRole("checkbox", { name: /만 19세 이상/ }));
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() =>
      expect(mocks.authState.completeRoleOnboarding).toHaveBeenCalledWith({ role: "founder" }),
    );
    expect(mocks.replacePath).toHaveBeenCalledWith("/chat?room=room-123", {
      intent: "auth",
    });
  });

  it("keeps legal-document links outside the consent labels during role onboarding", () => {
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
