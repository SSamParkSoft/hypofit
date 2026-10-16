import { describe, expect, it } from "vitest";

import { getSafeExternalUrl } from "./safeExternalUrl";

describe("getSafeExternalUrl", () => {
  it("allows only web meeting links", () => {
    expect(getSafeExternalUrl(" https://meet.example.com/room ")).toBe("https://meet.example.com/room");
    expect(getSafeExternalUrl("http://meet.example.com/room")).toBe("http://meet.example.com/room");
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeExternalUrl("data:text/html,unsafe")).toBeNull();
    expect(getSafeExternalUrl("not a url")).toBeNull();
  });
});
