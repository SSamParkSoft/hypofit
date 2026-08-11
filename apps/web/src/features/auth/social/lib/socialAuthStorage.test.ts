import { afterEach, describe, expect, it } from "vitest";

import {
  readStoredSocialAuthAttempt,
  SOCIAL_AUTH_STORAGE_KEY,
} from "./socialAuthStorage";

describe("socialAuthStorage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("preserves an explicit account-link intent through the provider callback", () => {
    window.sessionStorage.setItem(
      SOCIAL_AUTH_STORAGE_KEY,
      JSON.stringify({
        approvedReturnTo: "/profile/account",
        attemptId: "attempt-link-1",
        attemptSecret: "test-link-secret-that-is-long-enough",
        completionStartedAt: null,
        completedAt: null,
        createdAt: "2026-07-20T12:00:00Z",
        expiresAt: "2099-07-20T12:05:00Z",
        intent: "link",
        navigationTarget: null,
        provider: "google",
        providerIdentifier: "google",
      }),
    );

    expect(readStoredSocialAuthAttempt()).toMatchObject({
      approvedReturnTo: "/profile/account",
      intent: "link",
      provider: "google",
    });
  });
});
