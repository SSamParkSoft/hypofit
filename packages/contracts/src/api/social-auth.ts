export const SOCIAL_AUTH_PROVIDERS = ["apple", "google", "kakao", "naver"] as const;

export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

export const SOCIAL_AUTH_PLATFORMS = ["web", "ios", "android"] as const;

export type SocialAuthPlatform = (typeof SOCIAL_AUTH_PLATFORMS)[number];

export type SocialAuthFlow = "login" | "link";

export interface SocialAuthAttemptCreateInput {
  flow: SocialAuthFlow;
  platform: SocialAuthPlatform;
  provider: SocialAuthProvider;
  return_path?: string | null;
}

export interface SocialAuthLinkAttemptCreateInput {
  platform: SocialAuthPlatform;
  provider: SocialAuthProvider;
  return_path?: string | null;
}

export interface SocialAuthAttemptRead {
  attempt_id: string;
  attempt_secret: string;
  expires_at: string;
  flow: SocialAuthFlow;
  platform: SocialAuthPlatform;
  provider: SocialAuthProvider;
  return_path: string | null;
}

export interface SocialAuthCompleteInput {
  attempt_id: string;
  attempt_secret: string;
}

export type SocialAuthNextStep =
  | "signed_in"
  | "email_required"
  | "legal_consent_required"
  | "role_onboarding_required"
  | "profile_completion_required";

export interface SocialIdentityRead {
  email: string | null;
  email_verified: boolean | null;
  linked_at: string;
  provider: SocialAuthProvider;
  status: "active" | "revocation_pending" | "revoked";
}

export interface SocialAuthCompleteResponse {
  identity: SocialIdentityRead;
  next_step: SocialAuthNextStep;
  return_path: string | null;
}

export interface SocialIdentityListResponse {
  identities: SocialIdentityRead[];
}

export interface SocialIdentityReconcileResponse {
  identities: SocialIdentityRead[];
  reconciled_at: string;
  revoked_providers: SocialAuthProvider[];
}

export function isSocialAuthProvider(value: string): value is SocialAuthProvider {
  return SOCIAL_AUTH_PROVIDERS.some((provider) => provider === value);
}

export function isSocialAuthPlatform(value: string): value is SocialAuthPlatform {
  return SOCIAL_AUTH_PLATFORMS.some((platform) => platform === value);
}
