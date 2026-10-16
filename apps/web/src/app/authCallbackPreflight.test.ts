import { afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_AUTH_STORAGE_KEY } from "../features/auth/social/lib/socialAuthStorage";
import entrySource from "../main.tsx?raw";

const createClient = vi.hoisted(() => vi.fn(() => {
  expect(window.location.search).toBe("");
  expect(window.location.hash).toBe("");
  return {};
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("auth callback preflight", () => {
  it("runs before all application imports in the browser entry", () => {
    expect(entrySource.trimStart().startsWith('import "./app/authCallbackPreflight";')).toBe(true);
  });

  it.each(["sign_in", "link"])("strips pending Naver %s credentials before creating Supabase", async (intent) => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");
    window.history.replaceState(null, "", "/auth/social/callback?code=secret#access_token=secret&refresh_token=secret");
    window.sessionStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, JSON.stringify({
      provider: "naver", providerIdentifier: "custom:naver", intent,
      expiresAt: "2000-01-01T00:00:00Z",
    }));
    await import("./authCallbackPreflight");
    await import("../shared/supabase/client");
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toBeNull();
  });

  it.each(["apple", "google", "kakao"])("preserves %s callbacks", async (provider) => {
    vi.resetModules();
    window.history.replaceState(null, "", "/auth/social/callback?code=provider-code");
    const attempt = JSON.stringify({ provider, providerIdentifier: provider });
    window.sessionStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, attempt);
    await import("./authCallbackPreflight");
    expect(window.location.search).toBe("?code=provider-code");
    expect(window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toBe(attempt);
  });
});
