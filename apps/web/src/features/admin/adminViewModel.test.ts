import { describe, expect, it } from "vitest";
import { availableModerationActions, getReadinessIntent, readinessValues } from "./adminViewModel";

describe("operational status semantics", () => {
  it.each(["not_configured", "unconfigured", "disabled", "unavailable"])("does not mark %s as successful", (value) => { expect(getReadinessIntent(value)).toBe("warning"); });
  it("reads nested provider configuration independently", () => {
    expect(readinessValues({ status: "degraded", checks: { database: "unavailable", push: { enabled: true, apns: { enabled: true, configured: true }, fcm: { enabled: true, configured: false } }, outbound_email: { configured: false } } })).toEqual({ api: "degraded", database: "unavailable", apns: "설정됨", fcm: "미설정", email: "미설정" });
    expect(readinessValues(null).api).toBe("unknown");
  });
  it("does not offer unsupported actions for a chat room", () => {
    expect(availableModerationActions("chat_room")).toEqual(["close_report", "warn"]);
    expect(availableModerationActions("user")).not.toContain("hide");
  });
});
