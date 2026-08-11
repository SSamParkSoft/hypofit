import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiBaseUrl, apiRequest } from "./client";

function createResponse(input: {
  body?: string;
  headers?: Record<string, string>;
  status: number;
  statusText?: string;
}) {
  return {
    headers: new Headers(input.headers),
    ok: input.status >= 200 && input.status < 300,
    status: input.status,
    statusText: input.statusText ?? (input.status >= 200 && input.status < 300 ? "OK" : "Error"),
    text: vi.fn().mockResolvedValue(input.body ?? ""),
  } as unknown as Response;
}

describe("apiRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns undefined for 204 responses and preserves plain-text success bodies", async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({ status: 204 }))
      .mockResolvedValueOnce(
        createResponse({
          body: "ready",
          headers: { "Content-Type": "text/plain" },
          status: 200,
        }),
      );

    await expect(apiRequest<void>("/api/v1/empty")).resolves.toBeUndefined();
    await expect(apiRequest<string>("/api/v1/plain-text")).resolves.toBe("ready");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${apiBaseUrl}/api/v1/empty`,
      expect.objectContaining({ method: "GET" }),
    );

    const secondHeaders = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(secondHeaders.get("Accept")).toBe("application/json");
    expect(secondHeaders.get("X-Request-ID")).toMatch(/^req_/);
  });

  it("throws a structured ApiError for the FastAPI error envelope", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: JSON.stringify({
          detail: "legacy detail",
          error: {
            code: "validation_failed",
            field_errors: [
              {
                code: "required",
                field: "subject",
                message: "제목을 입력해 주세요.",
              },
            ],
            message: "입력값을 확인해 주세요.",
            request_id: "req_server_1",
          },
        }),
        headers: { "Content-Type": "application/json", "X-Request-ID": "req_server_1" },
        status: 422,
      }),
    );

    await expect(apiRequest("/api/v1/support/tickets")).rejects.toMatchObject({
      code: "validation_failed",
      fieldErrors: [{ code: "required", field: "subject", message: "제목을 입력해 주세요." }],
      isRetryable: false,
      kind: "http",
      requestId: "req_server_1",
      status: 422,
    });
  });

  it("throws an ApiError when a JSON response body is malformed", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: "{\"broken\":",
        headers: { "Content-Type": "application/json", "X-Request-ID": "req_broken_1" },
        status: 200,
      }),
    );

    let caughtError: unknown;
    try {
      await apiRequest("/api/v1/broken");
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect(caughtError).toMatchObject({
      code: "invalid_response_body",
      isRetryable: false,
      kind: "invalid_response",
      requestId: "req_broken_1",
      status: 200,
    });
  });

  it("classifies fetch failures as retryable network ApiError instances", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiRequest("/api/v1/network")).rejects.toMatchObject({
      code: "network_error",
      isNetworkError: true,
      isRetryable: true,
      kind: "network",
      status: null,
    });
  });

  it("classifies aborted fetches as non-retryable abort ApiError instances", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

    await expect(apiRequest("/api/v1/abort")).rejects.toMatchObject({
      code: "request_aborted",
      isAbortError: true,
      isRetryable: false,
      kind: "abort",
      status: null,
    });
  });
});
