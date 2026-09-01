import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "./client";
import {
  createSupportTicket,
  deleteSupportTicket,
  listSupportTickets,
  updateSupportTicket,
} from "./support";

describe("supportApi helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists support tickets with the kind filter and auth header", async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ "Content-Type": "application/json" }),
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify([{ id: "ticket-1" }])),
    });

    await expect(listSupportTickets("token-123", "inquiry")).resolves.toEqual([{ id: "ticket-1" }]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/support/tickets?kind=inquiry`,
      expect.any(Object),
    );

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("X-Request-ID")).toMatch(/^req_/);
  });

  it("creates a support ticket with the API request body", async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ "Content-Type": "application/json" }),
      ok: true,
      status: 201,
      text: vi.fn().mockResolvedValue(JSON.stringify({ id: "ticket-1" })),
    });

    await expect(
      createSupportTicket(
        {
          body: "로그인 후 문의를 다시 확인하고 싶어요.",
          category: "account",
          contact_email: "founder@example.com",
          kind: "inquiry",
          metadata: { source: "web_support" },
          subject: "문의 확인",
        },
        "token-123",
      ),
    ).resolves.toEqual({ id: "ticket-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/support/tickets`,
      expect.objectContaining({
        body: JSON.stringify({
          body: "로그인 후 문의를 다시 확인하고 싶어요.",
          category: "account",
          contact_email: "founder@example.com",
          kind: "inquiry",
          metadata: { source: "web_support" },
          subject: "문의 확인",
        }),
        method: "POST",
      }),
    );

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("updates a support ticket through the PATCH route", async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ "Content-Type": "application/json" }),
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ id: "ticket/1", body: "수정된 내용" })),
    });

    await expect(
      updateSupportTicket(
        "ticket/1",
        {
          body: "수정된 내용",
          contact_email: "founder@example.com",
        },
        "token-123",
      ),
    ).resolves.toEqual({ id: "ticket/1", body: "수정된 내용" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/support/tickets/ticket%2F1`,
      expect.objectContaining({
        body: JSON.stringify({
          body: "수정된 내용",
          contact_email: "founder@example.com",
        }),
        method: "PATCH",
      }),
    );
  });

  it("deletes a support ticket through the DELETE route", async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers(),
      ok: true,
      status: 204,
      text: vi.fn().mockResolvedValue(""),
    });

    await expect(deleteSupportTicket("ticket/1", "token-123")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/support/tickets/ticket%2F1`,
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});
