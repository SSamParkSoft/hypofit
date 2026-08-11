import { DEFAULT_POST_AUTH_PATH } from "../../authEntryState";
import { sanitizeSocialReturnTo } from "../lib/returnPath";

export type SocialAuthNextStep =
  | "account_reactivation_blocked"
  | "authenticated"
  | "email_required"
  | "email_verification"
  | "home"
  | "legal_consent"
  | "legal_consent_required"
  | "profile_completion"
  | "profile_completion_required"
  | "role_onboarding"
  | "role_onboarding_required"
  | "signed_in"
  | "unknown";

function normalizeSocialAuthNextStep(rawStep: string | null | undefined): SocialAuthNextStep {
  switch (rawStep) {
    case "authenticated":
    case "email_required":
    case "email_verification":
    case "home":
    case "legal_consent":
    case "legal_consent_required":
    case "profile_completion":
    case "profile_completion_required":
    case "role_onboarding":
    case "role_onboarding_required":
    case "signed_in":
    case "account_reactivation_blocked":
      return rawStep;
    default:
      return "unknown";
  }
}

export function resolveSocialAuthNavigationTarget(
  nextStep: string | null | undefined,
  returnTo: string | null | undefined,
) {
  const normalizedNextStep = normalizeSocialAuthNextStep(nextStep);

  if (
    normalizedNextStep === "authenticated" ||
    normalizedNextStep === "home" ||
    normalizedNextStep === "signed_in"
  ) {
    return sanitizeSocialReturnTo(returnTo);
  }

  return DEFAULT_POST_AUTH_PATH;
}
