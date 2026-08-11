import { describe, expect, it } from "vitest";

import {
  AUTH_BOOTSTRAP_STATUS_DELAY_MS,
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  buildRequestedPath,
  getAuthBootstrapState,
  resolvePostAuthPath,
} from "./authEntryState";

describe("auth entry state", () => {
  it("preserves the requested path with query and hash", () => {
    expect(
      buildRequestedPath({
        hash: "#thread",
        pathname: "/chat",
        search: "?room=abc",
      }),
    ).toBe("/chat?room=abc#thread");
  });

  it("preserves protected destinations and falls back for public routes", () => {
    expect(
      resolvePostAuthPath({
        hash: "#thread",
        pathname: "/chat",
        search: "?room=abc",
      }),
    ).toBe("/chat?room=abc#thread");
    expect(
      resolvePostAuthPath({
        pathname: "/interviews/post-1",
        search: "?apply=1",
      }),
    ).toBe("/interviews/post-1?apply=1");
    expect(
      resolvePostAuthPath({
        pathname: "/support",
      }),
    ).toBe("/app");
  });

  it.each([
    "/support/inquiries",
    "/support/inquiries/new",
    "/support/inquiries/11111111-1111-4111-8111-111111111111",
    "/report?target_type=chat_room&target_id=11111111-1111-4111-8111-111111111111",
  ])("preserves the protected support destination %s", (path) => {
    const url = new URL(path, "https://hypofit.local");

    expect(
      resolvePostAuthPath({
        hash: url.hash,
        pathname: url.pathname,
        search: url.search,
      }),
    ).toBe(path);
  });

  it("prioritizes offline recovery over bootstrap progress", () => {
    expect(
      getAuthBootstrapState({
        elapsedMs: AUTH_BOOTSTRAP_STATUS_DELAY_MS,
        hasError: false,
        isChecking: true,
        isOnline: false,
      }),
    ).toBe("offline");
  });

  it("switches to delayed feedback after the status threshold", () => {
    expect(
      getAuthBootstrapState({
        elapsedMs: AUTH_BOOTSTRAP_STATUS_DELAY_MS,
        hasError: false,
        isChecking: true,
        isOnline: true,
      }),
    ).toBe("delayed");
  });

  it("switches to recoverable error after the timeout or an auth bootstrap failure", () => {
    expect(
      getAuthBootstrapState({
        elapsedMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
        hasError: false,
        isChecking: true,
        isOnline: true,
      }),
    ).toBe("recoverable-error");

    expect(
      getAuthBootstrapState({
        elapsedMs: 0,
        hasError: true,
        isChecking: false,
        isOnline: true,
      }),
    ).toBe("recoverable-error");
  });
});
