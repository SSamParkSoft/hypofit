import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "./client";
import { getNotificationPreferences, updateNotificationPreferences } from "./push";

describe("pushApi notification preference helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads preferences with the authenticated request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user_id: "user-1", push_enabled: true }));

    await expect(getNotificationPreferences("token-123")).resolves.toMatchObject({
      push_enabled: true,
      user_id: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/notification-preferences`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
  });

  it("patches only the changed preference", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user_id: "user-1", chat_push_enabled: false }));

    await updateNotificationPreferences({ chat_push_enabled: false }, "token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/notification-preferences`,
      expect.objectContaining({
        body: JSON.stringify({ chat_push_enabled: false }),
        method: "PATCH",
      }),
    );
  });
});

function jsonResponse(body: Record<string, unknown>) {
  return {
    headers: new Headers({ "Content-Type": "application/json" }),
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}
