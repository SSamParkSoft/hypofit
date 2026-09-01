import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY } from "../features/auth/social/lib/lastUsedSocialProvider";
import { SOCIAL_AUTH_STORAGE_KEY } from "../features/auth/social/lib/socialAuthStorage";

const mocks = vi.hoisted(() => ({
  completeSocialAuth: vi.fn(),
  replacePath: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock("../features/auth/social/api/socialAuthApi", async () => {
  const actual = await vi.importActual<typeof import("../features/auth/social/api/socialAuthApi")>(
    "../features/auth/social/api/socialAuthApi",
  );
  return {
    ...actual,
    completeSocialAuth: (...args: unknown[]) => mocks.completeSocialAuth(...args),
  };
});

vi.mock("../shared/navigation/appNavigation", () => ({
  replacePath: (...args: unknown[]) => {
    const [path] = args;
    if (typeof path === "string") {
      window.history.replaceState(null, "", path);
    }
    return mocks.replacePath(...args);
  },
}));

import { AuthCallbackBridgePage } from "./AuthCallbackBridgePage";

describe("AuthCallbackBridgePage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    mocks.completeSocialAuth.mockReset();
    mocks.replacePath.mockReset();
    mocks.useAuth.mockReset();
    mocks.useAuth.mockReturnValue({
      accessToken: "social-access-token",
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("retries completion after a fresh callback lock expires instead of waiting forever", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(
      SOCIAL_AUTH_STORAGE_KEY,
      JSON.stringify({
        approvedReturnTo: "/profile/account",
        attemptId: "attempt-link-locked",
        attemptSecret: "test-link-secret-that-is-long-enough",
        completionStartedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        expiresAt: "2099-07-20T10:10:00Z",
        intent: "link",
        navigationTarget: null,
        provider: "google",
        providerIdentifier: "google",
      }),
    );
    window.history.replaceState(null, "", "/auth/social/callback?code=provider-code");
    mocks.completeSocialAuth.mockResolvedValue({
      nextStep: "signed_in",
      returnTo: "/profile/account",
    });

    render(<AuthCallbackBridgePage />);

    expect(mocks.completeSocialAuth).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "로그인 방법을 연결하고 있어요" }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_100);
    });

    expect(mocks.completeSocialAuth).toHaveBeenCalledWith("social-access-token", {
      attemptId: "attempt-link-locked",
      attemptSecret: "test-link-secret-that-is-long-enough",
    });
  });

  it("completes the callback once and strips callback codes from the URL", async () => {
    window.sessionStorage.setItem(
      SOCIAL_AUTH_STORAGE_KEY,
      JSON.stringify({
        approvedReturnTo: "/chat?room=room-123",
        attemptId: "attempt-1",
        attemptSecret: "test-attempt-secret-that-is-long-enough",
        completionStartedAt: null,
        completedAt: null,
        createdAt: "2026-07-20T10:00:00Z",
        expiresAt: "2099-07-20T10:10:00Z",
        intent: "sign_in",
        navigationTarget: null,
        provider: "google",
        providerIdentifier: "google",
      }),
    );
    window.history.replaceState(null, "", "/auth/social/callback?code=provider-code&state=provider-state");
    mocks.completeSocialAuth.mockResolvedValue({
      nextStep: "signed_in",
      returnTo: "/chat?room=room-123",
    });

    const view = render(<AuthCallbackBridgePage />);

    await waitFor(() =>
      expect(mocks.completeSocialAuth).toHaveBeenCalledWith("social-access-token", {
        attemptId: "attempt-1",
        attemptSecret: "test-attempt-secret-that-is-long-enough",
      }),
    );
    expect(mocks.replacePath).toHaveBeenCalledWith("/chat?room=room-123", { intent: "auth" });
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-123");
    expect(window.localStorage.getItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY)).toBe("google");

    view.rerender(<AuthCallbackBridgePage />);
    await waitFor(() => expect(mocks.completeSocialAuth).toHaveBeenCalledTimes(1));
  });

  it("does not treat account linking as the last used login method", async () => {
    window.localStorage.setItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY, "kakao");
    window.sessionStorage.setItem(
      SOCIAL_AUTH_STORAGE_KEY,
      JSON.stringify({
        approvedReturnTo: "/profile/account",
        attemptId: "attempt-link",
        attemptSecret: "test-link-secret-that-is-long-enough",
        completionStartedAt: null,
        completedAt: null,
        createdAt: "2026-07-20T10:00:00Z",
        expiresAt: "2099-07-20T10:10:00Z",
        intent: "link",
        navigationTarget: null,
        provider: "google",
        providerIdentifier: "google",
      }),
    );
    window.history.replaceState(null, "", "/auth/social/callback?code=provider-code");
    mocks.completeSocialAuth.mockResolvedValue({
      nextStep: "signed_in",
      returnTo: "/profile/account",
    });

    render(<AuthCallbackBridgePage />);

    await waitFor(() => expect(mocks.replacePath).toHaveBeenCalled());
    expect(window.localStorage.getItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY)).toBe("kakao");
  });

  it("normalizes cancelled callbacks without calling the completion endpoint", async () => {
    const user = userEvent.setup();

    window.sessionStorage.setItem(
      SOCIAL_AUTH_STORAGE_KEY,
      JSON.stringify({
        approvedReturnTo: "/support/inquiries",
        attemptId: "attempt-2",
        attemptSecret: "test-attempt-secret-that-is-long-enough",
        completionStartedAt: null,
        completedAt: null,
        createdAt: "2026-07-20T10:00:00Z",
        expiresAt: "2099-07-20T10:10:00Z",
        intent: "sign_in",
        navigationTarget: null,
        provider: "naver",
        providerIdentifier: "custom:naver",
      }),
    );
    window.history.replaceState(
      null,
      "",
      "/auth/social/callback?error=access_denied&error_description=user_cancelled",
    );

    render(<AuthCallbackBridgePage />);

    expect(screen.getByRole("heading", { level: 1, name: "소셜 로그인을 취소했어요" })).toBeInTheDocument();
    expect(mocks.completeSocialAuth).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/auth/social/callback");
    expect(window.location.search).toBe("");

    await user.click(screen.getByRole("button", { name: "다시 로그인하기" }));
    expect(mocks.replacePath).toHaveBeenCalledWith("/support/inquiries", { intent: "auth" });
  });

});
