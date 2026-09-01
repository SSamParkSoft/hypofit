import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "./client";
import {
  createInterviewPost,
  getInterviewPost,
  listInterviewPosts,
} from "./interviewPosts";
import {
  INTERVIEW_POST_FEATURES_HEADER,
  INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
} from "./interviewPostFeatures";

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

describe("interviewPosts capability headers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("adds the capability header to list requests and preserves custom headers", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: "[]",
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await listInterviewPosts(
      { status: "open" },
      { headers: { "X-Custom-Trace": "trace-1" } },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/interview-posts/?status=open`,
      expect.objectContaining({ method: "GET" }),
    );

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get(INTERVIEW_POST_FEATURES_HEADER)).toBe(
      INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
    );
    expect(headers.get("X-Custom-Trace")).toBe("trace-1");
  });

  it("adds the capability header to detail requests and preserves auth headers", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: "{}",
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await getInterviewPost("post_123", { accessToken: "token-123" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/interview-posts/post_123`,
      expect.objectContaining({ method: "GET" }),
    );

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get(INTERVIEW_POST_FEATURES_HEADER)).toBe(
      INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
    );
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("adds the capability header to create requests", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        body: "{}",
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await createInterviewPost(
      {
        duration_minutes: 30,
        interview_mode: "online",
        reward_amount: 50000,
        service_summary: "서비스 설명",
        target_description: "대상 설명",
        title: "인터뷰 제목",
      },
      "token-456",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/interview-posts/`,
      expect.objectContaining({ method: "POST" }),
    );

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get(INTERVIEW_POST_FEATURES_HEADER)).toBe(
      INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
    );
    expect(headers.get("Authorization")).toBe("Bearer token-456");
  });
});
