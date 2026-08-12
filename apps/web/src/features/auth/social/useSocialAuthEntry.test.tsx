import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { SOCIAL_AUTH_STORAGE_KEY } from "./lib/socialAuthStorage";
import { useSocialAuthEntry } from "./useSocialAuthEntry";

const mocks = vi.hoisted(() => ({
  createSocialAuthAttempt: vi.fn(),
  getSupabaseClientOrThrow: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("../authSupabase", () => ({
  getSupabaseClientOrThrow: () => mocks.getSupabaseClientOrThrow(),
}));

vi.mock("./api/socialAuthApi", async () => {
  const actual = await vi.importActual<typeof import("./api/socialAuthApi")>("./api/socialAuthApi");
  return {
    ...actual,
    createSocialAuthAttempt: (...args: unknown[]) => mocks.createSocialAuthAttempt(...args),
  };
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSocialAuthEntry", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/chat?room=room-123");
    window.sessionStorage.clear();
    mocks.createSocialAuthAttempt.mockReset();
    mocks.getSupabaseClientOrThrow.mockReset();
    mocks.signInWithOAuth.mockReset();
    mocks.createSocialAuthAttempt.mockResolvedValue({
      attemptId: "attempt-1",
      attemptSecret: "test-attempt-secret-that-is-long-enough",
      expiresAt: "2026-07-20T15:00:00Z",
      returnTo: "/chat?room=room-123",
    });
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: `${window.location.origin}/#oauth-provider` },
      error: null,
    });
    mocks.getSupabaseClientOrThrow.mockReturnValue({
      auth: {
        signInWithOAuth: mocks.signInWithOAuth,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("renders only the approved public web providers and redirects through Supabase OAuth", async () => {
    const { result } = renderHook(() => useSocialAuthEntry(), {
      wrapper: createWrapper(),
    });

    expect(result.current.providers.map((provider) => provider.provider)).toEqual([
      "kakao",
      "apple",
      "google",
      "naver",
    ]);

    await act(async () => {
      await result.current.startSocialAuth("kakao", "sign_in");
    });

    expect(mocks.createSocialAuthAttempt).toHaveBeenCalledWith({
      intent: "sign_in",
      provider: "kakao",
      returnTo: "/chat?room=room-123",
    });
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "kakao",
    });

    const storedAttempt = window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
    expect(storedAttempt).toContain("\"attemptId\":\"attempt-1\"");
    expect(storedAttempt).toContain("\"provider\":\"kakao\"");
  });

  it("starts Apple web sign-in with the Apple provider identifier and social callback redirect", async () => {
    const { result } = renderHook(() => useSocialAuthEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startSocialAuth("apple", "sign_in");
    });

    expect(mocks.createSocialAuthAttempt).toHaveBeenCalledWith({
      intent: "sign_in",
      provider: "apple",
      returnTo: "/chat?room=room-123",
    });
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "apple",
    });
  });

  it("starts Google web sign-in when the public provider is selected", async () => {
    const { result } = renderHook(() => useSocialAuthEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startSocialAuth("google", "sign_in");
    });

    expect(mocks.createSocialAuthAttempt).toHaveBeenCalledWith({
      intent: "sign_in",
      provider: "google",
      returnTo: "/chat?room=room-123",
    });
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "google",
    });
  });
});
