import { describe, expect, it } from "vitest";

import {
  getSocialProviderDefinition,
  getSocialProviderIdFromIdentifier,
  getVisibleWebSocialProviders,
  normalizeSocialProviderIdentifier,
} from "./providerRegistry";

describe("providerRegistry", () => {
  it("maps Kakao and Naver definitions to the correct auth provider identifiers", () => {
    expect(getSocialProviderDefinition("kakao").authProvider).toBe("kakao");
    expect(getSocialProviderDefinition("naver").authProvider).toBe("custom:naver");
  });

  it("normalizes raw provider identifiers to the canonical provider ids and auth identifiers", () => {
    expect(getSocialProviderIdFromIdentifier("kakao")).toBe("kakao");
    expect(getSocialProviderIdFromIdentifier("naver")).toBe("naver");
    expect(getSocialProviderIdFromIdentifier("custom:naver")).toBe("naver");
    expect(getSocialProviderIdFromIdentifier("unknown")).toBeNull();

    expect(normalizeSocialProviderIdentifier("kakao")).toBe("kakao");
    expect(normalizeSocialProviderIdentifier("naver")).toBe("custom:naver");
    expect(normalizeSocialProviderIdentifier("custom:naver")).toBe("custom:naver");
    expect(normalizeSocialProviderIdentifier("unknown")).toBeNull();
  });

  it("exposes the approved public web providers in product order", () => {
    expect(getVisibleWebSocialProviders()).toEqual(["kakao", "apple", "google", "naver"]);
  });
});
