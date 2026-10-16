import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeContext, scrubBreadcrumb, scrubDiagnosticEvent } from "../src/shared/diagnostics/privacy.ts";

test("diagnostics keep bounded context without coordinates, tokens or URL query values", () => {
  assert.deepEqual(sanitizeContext({
    path: "/api/v1/interview-posts?lat=37.1&lng=127.2&query=private#secret",
    route: "/auth/callback?code=private-token",
    status: 503,
    retryable: true,
    latitude: 37.1,
    token: "secret",
    email: "person@example.com",
    phase: { nested: "private" },
  }), { path: "/api/v1/interview-posts", route: "/auth/callback", status: 503, retryable: true });
  assert.equal(sanitizeContext({ phase: "x".repeat(300) }).phase.length, 180);
  assert.equal(sanitizeContext({ email: "person@example.com" }), undefined);
});

test("only app-owned sanitized breadcrumbs are retained", () => {
  for (const category of ["http", "xhr", "fetch", "console", "navigation", "ui.click"]) {
    assert.equal(scrubBreadcrumb({ category, message: "private", data: { url: "https://example.com?lat=37" } }), null);
  }
  assert.deepEqual(scrubBreadcrumb({
    category: "hypofit.startup", message: "map_location_resolved", data: { source: "current", lat: 37 },
  }), { category: "hypofit.startup", message: "map_location_resolved", data: { source: "current" } });
  assert.equal(scrubBreadcrumb({ category: "hypofit.startup", message: "Error: person@example.com" }).message, "[redacted]");
});

test("push diagnostics omit resource identifiers, deduplication fingerprints and location accuracy", () => {
  const context = {
    fingerprint: "notification-example:chat_message:chat_room:room-example:request-example",
    notification_id: "notification-example",
    target_id: "room-example",
    accuracy: 12,
    kind: "chat_room",
    source: "listener",
    type: "chat_message",
    request_id: "req_example",
  };
  const expected = {
    kind: "chat_room", source: "listener", type: "chat_message", request_id: "req_example",
  };

  assert.deepEqual(sanitizeContext(context), expected);
  assert.deepEqual(scrubBreadcrumb({
    category: "hypofit.startup", message: "push_notification_response_deferred", data: context,
  }).data, expected);
  const event = scrubDiagnosticEvent({
    extra: context,
    breadcrumbs: [{ category: "hypofit.startup", message: "map_location_resolved", data: context }],
  });
  assert.deepEqual(event.extra, expected);
  assert.deepEqual(event.breadcrumbs[0].data, expected);
});

test("before-send strips request data and native breadcrumbs while preserving stack metadata", () => {
  const event = scrubDiagnosticEvent({
    user: { email: "person@example.com" },
    request: { url: "https://example.com?lat=37", headers: { Authorization: "Bearer secret" } },
    message: "private text",
    extra: { request_id: "req_example", path: "/api?lat=37", email: "person@example.com" },
    breadcrumbs: [
      { category: "http", data: { url: "https://example.com?token=secret" } },
      { category: "hypofit.startup", message: "splash_redirect", data: { nextRoute: "/app#token=secret" } },
    ],
    exception: { values: [{ type: "Error", value: "private", stacktrace: { frames: [{ function: "load" }] } }] },
  });
  assert.equal(event.user, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.message, "[redacted]");
  assert.deepEqual(event.extra, { request_id: "req_example", path: "/api" });
  assert.equal(event.breadcrumbs.length, 1);
  assert.equal(event.breadcrumbs[0].data.nextRoute, "/app");
  assert.equal(event.exception.values[0].value, "Error details redacted");
  assert.equal(event.exception.values[0].stacktrace.frames[0].function, "load");
});
