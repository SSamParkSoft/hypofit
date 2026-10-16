import { describe, expect, it } from "vitest";

import { resolveSocialAuthNavigationTarget } from "./socialAuthMachine";

describe("resolveSocialAuthNavigationTarget", () => {
  it.each(["email_required", "email_verification", "account_reactivation_blocked", "unknown", "future_step", "", null, undefined])(
    "blocks %s instead of entering the app",
    (step) => expect(resolveSocialAuthNavigationTarget(step, "/chat")).toBeNull(),
  );

  it.each(["authenticated", "home", "signed_in"])("restores the approved route for %s", (step) => {
    expect(resolveSocialAuthNavigationTarget(step, "/chat")).toBe("/chat");
  });

  it.each(["legal_consent", "legal_consent_required", "profile_completion", "profile_completion_required", "role_onboarding", "role_onboarding_required"])(
    "preserves onboarding for %s",
    (step) => expect(resolveSocialAuthNavigationTarget(step, "/chat")).toBe("/app"),
  );
});
