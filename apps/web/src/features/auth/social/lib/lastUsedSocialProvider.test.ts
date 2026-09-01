import { beforeEach, describe, expect, it } from "vitest";

import {
  LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY,
  readLastUsedSocialProvider,
  writeLastUsedSocialProvider,
} from "./lastUsedSocialProvider";

describe("lastUsedSocialProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists and reads the last successful provider on this browser", () => {
    expect(writeLastUsedSocialProvider("google")).toBe(true);
    expect(readLastUsedSocialProvider()).toBe("google");
  });

  it("ignores an unknown stored provider", () => {
    window.localStorage.setItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY, "unknown");
    expect(readLastUsedSocialProvider()).toBeNull();
  });
});
