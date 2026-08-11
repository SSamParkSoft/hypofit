import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { ApiError } from "./client";
import { clearProtectedQueryCache, shouldRetryApiQuery } from "./queryClient";

function createApiError(input: {
  code: string;
  kind: "abort" | "http" | "invalid_response" | "network";
  status?: number | null;
}) {
  return new ApiError({
    code: input.code,
    kind: input.kind,
    message: "request failed",
    method: "GET",
    path: "/api/v1/test",
    status: input.status ?? null,
  });
}

describe("queryClient helpers", () => {
  it("retries only bounded network and 5xx failures", () => {
    expect(shouldRetryApiQuery(0, createApiError({ code: "network_error", kind: "network" }))).toBe(true);
    expect(shouldRetryApiQuery(1, createApiError({ code: "network_error", kind: "network" }))).toBe(true);
    expect(shouldRetryApiQuery(2, createApiError({ code: "network_error", kind: "network" }))).toBe(false);
    expect(shouldRetryApiQuery(0, createApiError({ code: "external_service_unavailable", kind: "http", status: 503 }))).toBe(true);
    expect(shouldRetryApiQuery(0, createApiError({ code: "conflict", kind: "http", status: 409 }))).toBe(false);
    expect(shouldRetryApiQuery(0, createApiError({ code: "request_aborted", kind: "abort" }))).toBe(false);
  });

  it("clears only protected query roots and can scope removal by stable user id", () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(["applications", "user-1", "api"], ["application"]);
    queryClient.setQueryData(["applications", "user-2", "api"], ["application"]);
    queryClient.setQueryData(["chat-rooms", "user-1", "api"], ["chat-room"]);
    queryClient.setQueryData(["interview-posts", null, "api"], ["public-post"]);

    clearProtectedQueryCache(queryClient, "user-1");

    expect(queryClient.getQueryData(["applications", "user-1", "api"])).toBeUndefined();
    expect(queryClient.getQueryData(["chat-rooms", "user-1", "api"])).toBeUndefined();
    expect(queryClient.getQueryData(["applications", "user-2", "api"])).toEqual(["application"]);
    expect(queryClient.getQueryData(["interview-posts", null, "api"])).toEqual(["public-post"]);

    clearProtectedQueryCache(queryClient);

    expect(queryClient.getQueryData(["applications", "user-2", "api"])).toBeUndefined();
    expect(queryClient.getQueryData(["interview-posts", null, "api"])).toEqual(["public-post"]);
  });
});
