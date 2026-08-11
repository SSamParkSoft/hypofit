import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "../../../../shared/api/client";
import {
  createSocialAuthLinkAttempt,
  getSocialAuthCapabilities,
  reconcileSocialAuthIdentities,
} from "./socialAuthApi";

function createResponse(input: {
  body?: string;
  headers?: Record<string, string>;
  status: number;
}) {
  return {
    headers: new Headers(input.headers),
    ok: input.status >= 200 && input.status < 300,
    status: input.status,
    statusText: input.status >= 200 && input.status < 300 ? "OK" : "Error",
    text: vi.fn().mockResolvedValue(input.body ?? ""),
  } as unknown as Response;
}

describe("socialAuthApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads capabilities from the web contract and normalizes provider identifiers", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: JSON.stringify({
          providers: [
            {
              enabled: false,
              id: "custom:naver",
              state: "review_pending",
            },
            {
              enabled: true,
              provider: "google",
              state: "available",
            },
            {
              disabled_reason: "social_unsupported_platform",
              enabled: false,
              provider: "apple",
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(getSocialAuthCapabilities()).resolves.toEqual([
      {
        disabledReason: "social_unsupported_platform",
        enabled: false,
        provider: "apple",
        providerIdentifier: "apple",
        state: "unsupported_platform",
      },
      {
        disabledReason: null,
        enabled: true,
        provider: "google",
        providerIdentifier: "google",
        state: "available",
      },
      {
        disabledReason: null,
        enabled: false,
        provider: "naver",
        providerIdentifier: "custom:naver",
        state: "review_pending",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/auth/social/capabilities?platform=web`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("keeps email login available when the optional capability endpoint is not deployed", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: JSON.stringify({
          error: {
            code: "not_found",
            message: "요청한 정보를 찾지 못했어요.",
            status: 404,
          },
        }),
        headers: { "Content-Type": "application/json" },
        status: 404,
      }),
    );

    await expect(getSocialAuthCapabilities()).resolves.toEqual([]);
  });

  it("creates an authenticated account-link attempt for the current user", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: JSON.stringify({
          attempt_id: "attempt-link-1",
          attempt_secret: "test-link-secret-that-is-long-enough",
          expires_at: "2026-07-20T15:00:00Z",
          flow: "link",
          platform: "web",
          provider: "google",
          return_path: "/profile/account",
        }),
        headers: { "Content-Type": "application/json" },
        status: 201,
      }),
    );

    await expect(
      createSocialAuthLinkAttempt("user-access-token", {
        provider: "google",
        returnTo: "/profile/account",
      }),
    ).resolves.toEqual({
      attemptId: "attempt-link-1",
      attemptSecret: "test-link-secret-that-is-long-enough",
      expiresAt: "2026-07-20T15:00:00Z",
      returnTo: "/profile/account",
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(`${apiBaseUrl}/api/v1/auth/social/identities/link-attempts`);
    expect(requestInit).toMatchObject({
      body: JSON.stringify({
        platform: "web",
        provider: "google",
        return_path: "/profile/account",
      }),
      method: "POST",
    });
    expect(new Headers(requestInit.headers).get("Authorization")).toBe("Bearer user-access-token");
  });

  it("reconciles provider inventory before displaying linked login methods", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: JSON.stringify({
          identities: [
            {
              email: "user@example.com",
              email_verified: true,
              linked_at: "2026-07-29T12:00:00Z",
              provider: "google",
              status: "active",
            },
          ],
          reconciled_at: "2026-07-29T12:00:01Z",
          revoked_providers: [],
        }),
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(reconcileSocialAuthIdentities("user-access-token")).resolves.toEqual([
      {
        email: "user@example.com",
        emailVerified: true,
        linkedAt: "2026-07-29T12:00:00Z",
        provider: "google",
        providerIdentifier: "google",
        status: "active",
      },
    ]);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(`${apiBaseUrl}/api/v1/auth/social/identities/reconcile`);
    expect(requestInit.method).toBe("POST");
    expect(new Headers(requestInit.headers).get("Authorization")).toBe("Bearer user-access-token");
  });
});
