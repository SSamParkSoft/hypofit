import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_AUTH_STORAGE_KEY } from "./lib/socialAuthStorage";
import { useSocialIdentityLinking } from "./useSocialIdentityLinking";

const mocks = vi.hoisted(() => ({
  createSocialAuthLinkAttempt: vi.fn(),
  getSupabaseClientOrThrow: vi.fn(),
  linkIdentity: vi.fn(),
  useAuth: vi.fn(),
  useSocialAuthCapabilities: vi.fn(),
}));

vi.mock("../useAuth", () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock("../authSupabase", () => ({
  getSupabaseClientOrThrow: () => mocks.getSupabaseClientOrThrow(),
}));

vi.mock("./useSocialAuthCapabilities", () => ({
  useSocialAuthCapabilities: () => mocks.useSocialAuthCapabilities(),
}));

vi.mock("./api/socialAuthApi", async () => {
  const actual = await vi.importActual<typeof import("./api/socialAuthApi")>("./api/socialAuthApi");
  return {
    ...actual,
    createSocialAuthLinkAttempt: (...args: unknown[]) =>
      mocks.createSocialAuthLinkAttempt(...args),
  };
});

describe("useSocialIdentityLinking", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mocks.createSocialAuthLinkAttempt.mockResolvedValue({
      attemptId: "attempt-link-1",
      attemptSecret: "test-link-secret-that-is-long-enough",
      expiresAt: "2099-07-20T15:00:00Z",
      returnTo: "/profile/account",
    });
    mocks.linkIdentity.mockResolvedValue({
      data: { url: `${window.location.origin}/#social-link-provider` },
      error: null,
    });
    mocks.getSupabaseClientOrThrow.mockReturnValue({
      auth: { linkIdentity: mocks.linkIdentity },
    });
    mocks.useAuth.mockReturnValue({ accessToken: "user-access-token" });
    mocks.useSocialAuthCapabilities.mockReturnValue({
      data: [
        {
          disabledReason: null,
          enabled: true,
          provider: "google",
          providerIdentifier: "google",
          state: "available",
        },
      ],
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("binds the link attempt to the current session before provider authorization", async () => {
    const { result } = renderHook(() => useSocialIdentityLinking());

    await act(async () => {
      await result.current.linkProvider("google");
    });

    expect(mocks.createSocialAuthLinkAttempt).toHaveBeenCalledWith("user-access-token", {
      provider: "google",
      returnTo: "/profile/account",
    });
    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "google",
    });
    expect(window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toContain('"intent":"link"');
  });

  it("starts Apple web identity linking with the Apple provider identifier and social callback redirect", async () => {
    mocks.useSocialAuthCapabilities.mockReturnValue({
      data: [
        {
          disabledReason: null,
          enabled: true,
          provider: "apple",
          providerIdentifier: "apple",
          state: "available",
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useSocialIdentityLinking());

    await act(async () => {
      await result.current.linkProvider("apple");
    });

    expect(mocks.createSocialAuthLinkAttempt).toHaveBeenCalledWith("user-access-token", {
      provider: "apple",
      returnTo: "/profile/account",
    });
    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "apple",
    });
  });

  it("starts Kakao account linking with the Kakao Supabase provider while preserving the link attempt and callback redirect", async () => {
    mocks.useSocialAuthCapabilities.mockReturnValue({
      data: [
        {
          disabledReason: null,
          enabled: true,
          provider: "kakao",
          providerIdentifier: "kakao",
          state: "available",
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useSocialIdentityLinking());

    await act(async () => {
      await result.current.linkProvider("kakao");
    });

    expect(mocks.createSocialAuthLinkAttempt).toHaveBeenCalledWith("user-access-token", {
      provider: "kakao",
      returnTo: "/profile/account",
    });
    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "kakao",
    });

    const storedAttempt = window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
    expect(storedAttempt).toContain("\"provider\":\"kakao\"");
    expect(storedAttempt).toContain("\"providerIdentifier\":\"kakao\"");
  });

  it("starts Naver account linking with the custom Supabase provider while preserving the link attempt and callback redirect", async () => {
    mocks.useSocialAuthCapabilities.mockReturnValue({
      data: [
        {
          disabledReason: null,
          enabled: true,
          provider: "naver",
          providerIdentifier: "custom:naver",
          state: "available",
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useSocialIdentityLinking());

    await act(async () => {
      await result.current.linkProvider("naver");
    });

    expect(mocks.createSocialAuthLinkAttempt).toHaveBeenCalledWith("user-access-token", {
      provider: "naver",
      returnTo: "/profile/account",
    });
    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      options: {
        redirectTo: `${window.location.origin}/auth/social/callback`,
        skipBrowserRedirect: true,
      },
      provider: "custom:naver",
    });

    const storedAttempt = window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
    expect(storedAttempt).toContain("\"provider\":\"naver\"");
    expect(storedAttempt).toContain("\"providerIdentifier\":\"custom:naver\"");
  });
});
