import type {
  SocialAuthAttemptCreateInput,
  SocialAuthAttemptRead,
  SocialAuthCapabilitiesResponse,
  SocialAuthCompleteInput,
  SocialAuthCompleteResponse,
  SocialAuthLinkAttemptCreateInput,
  SocialAuthPlatform,
  SocialIdentityListResponse,
  SocialIdentityReconcileResponse,
} from "@hypofit/contracts";
import { apiRequest } from "./client";

function buildProvidersPath(platform: SocialAuthPlatform) {
  return `/api/v1/auth/social/capabilities?platform=${encodeURIComponent(platform)}`;
}

export function getSocialAuthCapabilities(platform: SocialAuthPlatform) {
  return apiRequest<SocialAuthCapabilitiesResponse>(buildProvidersPath(platform));
}

export function createSocialAuthAttempt(input: SocialAuthAttemptCreateInput) {
  return apiRequest<SocialAuthAttemptRead>("/api/v1/auth/social/attempts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createSocialAuthLinkAttempt(
  input: SocialAuthLinkAttemptCreateInput,
  accessToken: string,
) {
  return apiRequest<SocialAuthAttemptRead>("/api/v1/auth/social/identities/link-attempts", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function completeSocialAuthAttempt(input: SocialAuthCompleteInput, accessToken: string) {
  return apiRequest<SocialAuthCompleteResponse>("/api/v1/auth/social/complete", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getSocialIdentities(accessToken: string) {
  return apiRequest<SocialIdentityListResponse>("/api/v1/auth/social/identities", {
    accessToken,
  });
}

export function reconcileSocialIdentities(accessToken: string) {
  return apiRequest<SocialIdentityReconcileResponse>("/api/v1/auth/social/identities/reconcile", {
    method: "POST",
    accessToken,
  });
}

export const socialAuthApi = {
  getCapabilities: getSocialAuthCapabilities,
  createAttempt: createSocialAuthAttempt,
  createLinkAttempt: createSocialAuthLinkAttempt,
  completeAttempt: completeSocialAuthAttempt,
  getIdentities: getSocialIdentities,
  reconcileIdentities: reconcileSocialIdentities,
} as const;
