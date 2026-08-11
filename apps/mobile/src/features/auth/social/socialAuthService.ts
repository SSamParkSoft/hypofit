import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type {
  SocialAuthAttemptRead,
  SocialAuthCompleteResponse,
  SocialAuthPlatform,
  SocialAuthProvider,
  SocialAuthProviderCapability,
  SocialIdentityRead,
} from "@hypofit/contracts";
import type { Href } from "expo-router";
import { ApiError, NetworkError } from "@/shared/api/client";
import { socialAuthApi } from "@/shared/api/socialAuth";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";
import { getSafeReturnTo } from "@/shared/navigation/backNavigation";
import { getSupabaseClient } from "@/shared/api/supabase";

WebBrowser.maybeCompleteAuthSession();

const pendingAttemptStorageKey = "hypofit.social-auth.pending.v1";
const socialCallbackRedirectUri = "hypofit://auth/social-callback";

export type SocialAuthErrorCode =
  | "social_provider_disabled"
  | "social_provider_review_pending"
  | "social_unsupported_platform"
  | "social_authorization_cancelled"
  | "social_callback_expired"
  | "social_state_mismatch"
  | "social_code_exchange_failed"
  | "social_provider_unavailable"
  | "social_email_missing"
  | "social_identity_conflict"
  | "social_identity_not_verified"
  | "social_account_link_required"
  | "social_account_inactive"
  | "social_rejoin_blocked"
  | "social_profile_sync_failed"
  | "social_legal_consent_required"
  | "social_attempt_replayed"
  | "social_unknown";

export type SocialAuthResult =
  | { status: "completed"; response: SocialAuthCompleteResponse }
  | { status: "pending_callback"; provider: SocialAuthProvider }
  | { status: "cancelled"; provider: SocialAuthProvider };

const publicProviderOrderByPlatform = {
  android: ["kakao", "google", "naver"],
  ios: ["kakao", "apple", "google", "naver"],
} as const;

type SocialPhase =
  | "provider_capability"
  | "attempt_create"
  | "provider_authorization"
  | "provider_callback"
  | "supabase_token_exchange"
  | "supabase_session_persist"
  | "fastapi_identity_resolve";

type PendingSocialAttempt = {
  attemptId: string;
  attemptSecret: string;
  expiresAt: string;
  platform: SocialAuthPlatform;
  provider: SocialAuthProvider;
  returnPath: string | null;
};

class UserFacingSocialAuthError extends Error {
  readonly code: SocialAuthErrorCode;
  readonly phase: SocialPhase;

  constructor(code: SocialAuthErrorCode, phase: SocialPhase, message?: string) {
    super(message ?? getSocialAuthMessageByCode(code));
    this.name = "UserFacingSocialAuthError";
    this.code = code;
    this.phase = phase;
  }
}

export function getSocialAuthPlatform(): SocialAuthPlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function getSocialCallbackRedirectUri() {
  return socialCallbackRedirectUri;
}

export async function loadSocialAuthCapabilities() {
  return socialAuthApi.getCapabilities(getSocialAuthPlatform());
}

export async function loadSocialIdentities(accessToken: string) {
  const response = await socialAuthApi.reconcileIdentities(accessToken);
  return response.identities;
}

export async function clearPendingSocialAuthAttempt() {
  await clearPendingAttempt();
}

export async function startSocialAuth(provider: SocialAuthProvider, returnPath?: unknown): Promise<SocialAuthResult> {
  const platform = getSocialAuthPlatform();
  const safeReturnPath = toSafeReturnPath(returnPath);

  addAppBreadcrumb("social_auth_attempt_create_start", {
    phase: "attempt_create",
    platform,
    provider_name: provider,
  });

  let attempt: SocialAuthAttemptRead;

  try {
    attempt = await socialAuthApi.createAttempt({
      flow: "login",
      platform,
      provider,
      return_path: safeReturnPath,
    });
  } catch (error) {
    throw normalizeSocialAuthError(error, "attempt_create");
  }

  await persistPendingAttempt({
    attemptId: attempt.attempt_id,
    attemptSecret: attempt.attempt_secret,
    expiresAt: attempt.expires_at,
    platform: attempt.platform,
    provider: attempt.provider,
    returnPath: attempt.return_path,
  });

  if (provider === "apple") {
    return signInWithApple(attempt);
  }

  return startBrowserOAuth(attempt);
}

export async function startSocialIdentityLink(
  provider: SocialAuthProvider,
  accessToken: string,
  returnPath?: unknown,
): Promise<SocialAuthResult> {
  const platform = getSocialAuthPlatform();
  const safeReturnPath = toSafeReturnPath(returnPath);

  addAppBreadcrumb("social_identity_link_attempt_create_start", {
    phase: "attempt_create",
    platform,
    provider_name: provider,
  });

  let attempt: SocialAuthAttemptRead;

  try {
    attempt = await socialAuthApi.createLinkAttempt(
      {
        platform,
        provider,
        return_path: safeReturnPath,
      },
      accessToken,
    );
  } catch (error) {
    throw normalizeSocialAuthError(error, "attempt_create");
  }

  await persistPendingAttempt({
    attemptId: attempt.attempt_id,
    attemptSecret: attempt.attempt_secret,
    expiresAt: attempt.expires_at,
    platform: attempt.platform,
    provider: attempt.provider,
    returnPath: attempt.return_path,
  });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: toSupabaseProvider(provider),
      options: {
        redirectTo: socialCallbackRedirectUri,
        scopes: getProviderScopes(provider),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw error ?? new Error("missing_social_provider_url");
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, socialCallbackRedirectUri);
    const resultType = typeof result?.type === "string" ? result.type : "unknown";

    if (resultType === "cancel" || resultType === "dismiss") {
      await clearPendingAttempt();
      return { status: "cancelled", provider };
    }

    if (resultType !== "success") {
      throw new UserFacingSocialAuthError("social_provider_unavailable", "provider_authorization");
    }

    if ("url" in result && typeof result.url === "string" && result.url) {
      return {
        status: "completed",
        response: await completeSocialAuthFromCallback(result.url),
      };
    }

    return { status: "pending_callback", provider };
  } catch (error) {
    await clearPendingAttempt();
    throw normalizeSocialAuthError(error, "provider_authorization");
  }
}

export async function completeSocialAuthFromCallback(url?: string): Promise<SocialAuthCompleteResponse> {
  const attempt = await readPendingAttempt();
  if (!attempt) {
    throw new UserFacingSocialAuthError("social_callback_expired", "provider_callback");
  }

  const params = parseAuthParams(url);
  if (isProviderCancellation(params)) {
    await clearPendingAttempt();
    throw new UserFacingSocialAuthError("social_authorization_cancelled", "provider_callback");
  }

  if (!params.code && !(params.access_token && params.refresh_token)) {
    await clearPendingAttempt();
    throw new UserFacingSocialAuthError("social_callback_expired", "provider_callback");
  }

  addAppBreadcrumb("social_auth_callback_exchange_start", {
    phase: "supabase_token_exchange",
    provider_name: attempt.provider,
  });

  try {
    const supabase = getSupabaseClient();
    const session =
      params.code
        ? await exchangeCodeForSession(params.code)
        : await restoreSessionFromCallbackTokens(params.access_token!, params.refresh_token!);

    return finalizeSocialAuthAttempt(attempt, session.access_token);
  } catch (error) {
    await clearPendingAttempt();
    throw normalizeSocialAuthError(error, "supabase_token_exchange");
  }
}

export function getSupportedSocialProviders(capabilities: SocialAuthProviderCapability[]) {
  return capabilities.filter((capability) => capability.enabled);
}

export function getPublicMobileSocialProviders(
  capabilities: SocialAuthProviderCapability[],
  platform: SocialAuthPlatform = getSocialAuthPlatform(),
) {
  const orderedProviders = getPublicMobileSocialProviderIds(platform);
  const enabledProviders = new Map(
    capabilities.filter((capability) => capability.enabled).map((capability) => [capability.provider, capability]),
  );

  return orderedProviders
    .map((provider) => enabledProviders.get(provider))
    .filter((capability): capability is SocialAuthProviderCapability => Boolean(capability));
}

export function getPublicMobileSocialProviderIds(
  platform: SocialAuthPlatform = getSocialAuthPlatform(),
): SocialAuthProvider[] {
  return [...(platform === "ios" ? publicProviderOrderByPlatform.ios : publicProviderOrderByPlatform.android)];
}

export function getSocialAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof UserFacingSocialAuthError) {
    return error.message;
  }

  return fallback;
}

export function getSocialAuthDiagnosticCode(error: unknown) {
  if (error instanceof UserFacingSocialAuthError) {
    return error.code;
  }

  return "social_unknown";
}

export function resolveSocialAuthRoute(response: SocialAuthCompleteResponse): Href | null {
  switch (response.next_step) {
    case "signed_in":
      return getSafeReturnTo(response.return_path) ?? "/(tabs)/home";
    case "role_onboarding_required":
    case "legal_consent_required":
    case "profile_completion_required": {
      const safeReturnTo = getSafeReturnTo(response.return_path);
      const returnTo = typeof safeReturnTo === "string" ? safeReturnTo : null;
      return returnTo
        ? (`/(auth)/sign-up-role?returnTo=${encodeURIComponent(returnTo)}` as Href)
        : "/(auth)/sign-up-role";
    }
    case "email_required":
      return null;
  }
}

export function getUnsupportedSocialNextStepMessage(response: SocialAuthCompleteResponse) {
  if (response.next_step === "email_required") {
    return "연락받을 이메일 확인이 필요한 계정이에요. 현재 앱에서는 이메일 보완을 바로 진행할 수 없어요.";
  }

  return "로그인을 이어가지 못했어요. 다시 시도해 주세요.";
}

export function getSocialIdentityLabel(identity: SocialIdentityRead) {
  const base = socialProviderLabels[identity.provider];
  if (!identity.email) {
    return `${base} 연결됨`;
  }

  return `${base} · ${maskEmail(identity.email)}`;
}

export function getSocialIdentityStatusLabel(identity: SocialIdentityRead) {
  if (identity.status === "revocation_pending") {
    return "해제 처리 중";
  }

  if (identity.status === "revoked") {
    return "해제됨";
  }

  return identity.email_verified ? "연결됨" : "연결됨";
}

export const socialProviderLabels: Record<SocialAuthProvider, string> = {
  apple: "Apple",
  google: "Google",
  kakao: "Kakao",
  naver: "Naver",
};

async function signInWithApple(attempt: SocialAuthAttemptRead): Promise<SocialAuthResult> {
  if (Platform.OS !== "ios") {
    await clearPendingAttempt();
    throw new UserFacingSocialAuthError("social_unsupported_platform", "provider_authorization");
  }

  try {
    const rawNonce = Crypto.randomUUID();
    const state = attempt.attempt_id;
    const credential = await AppleAuthentication.signInAsync({
      nonce: rawNonce,
      state,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });

    if (!credential.identityToken) {
      throw new UserFacingSocialAuthError("social_code_exchange_failed", "supabase_session_persist");
    }

    if (credential.state !== state) {
      throw new UserFacingSocialAuthError("social_callback_expired", "provider_callback");
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error || !data.session) {
      throw error ?? new Error("missing_social_session");
    }

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .trim();

    if (fullName) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          family_name: credential.fullName?.familyName ?? null,
          full_name: fullName,
          given_name: credential.fullName?.givenName ?? null,
          name: fullName,
        },
      });
      if (metadataError) {
        captureAppError(metadataError, {
          code: "social_profile_sync_failed",
          phase: "supabase_session_persist",
        });
      }
    }

    return {
      status: "completed",
      response: await finalizeSocialAuthAttempt(
        {
          attemptId: attempt.attempt_id,
          attemptSecret: attempt.attempt_secret,
          expiresAt: attempt.expires_at,
          platform: attempt.platform,
          provider: attempt.provider,
          returnPath: attempt.return_path,
        },
        data.session.access_token,
      ),
    };
  } catch (error) {
    await clearPendingAttempt();

    if (isAppleAuthorizationCancelled(error)) {
      return { status: "cancelled", provider: "apple" };
    }

    throw normalizeSocialAuthError(error, "provider_authorization");
  }
}

async function startBrowserOAuth(attempt: SocialAuthAttemptRead): Promise<SocialAuthResult> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: toSupabaseProvider(attempt.provider),
      options: {
        redirectTo: socialCallbackRedirectUri,
        scopes: getProviderScopes(attempt.provider),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw error ?? new Error("missing_social_provider_url");
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, socialCallbackRedirectUri);
    const resultType = typeof result?.type === "string" ? result.type : "unknown";

    if (resultType === "cancel" || resultType === "dismiss") {
      await clearPendingAttempt();
      return { status: "cancelled", provider: attempt.provider };
    }

    if (resultType !== "success") {
      throw new UserFacingSocialAuthError("social_provider_unavailable", "provider_authorization");
    }

    if ("url" in result && typeof result.url === "string" && result.url) {
      return {
        status: "completed",
        response: await completeSocialAuthFromCallback(result.url),
      };
    }

    return { status: "pending_callback", provider: attempt.provider };
  } catch (error) {
    await clearPendingAttempt();
    throw normalizeSocialAuthError(error, "provider_authorization");
  }
}

async function finalizeSocialAuthAttempt(attempt: PendingSocialAttempt, accessToken: string) {
  addAppBreadcrumb("social_auth_complete_start", {
    phase: "fastapi_identity_resolve",
    provider_name: attempt.provider,
  });

  try {
    const response = await socialAuthApi.completeAttempt(
      {
        attempt_id: attempt.attemptId,
        attempt_secret: attempt.attemptSecret,
      },
      accessToken,
    );

    await clearPendingAttempt();
    addAppBreadcrumb("social_auth_complete_success", {
      phase: "fastapi_identity_resolve",
      provider_name: attempt.provider,
    });
    return response;
  } catch (error) {
    await clearPendingAttempt();
    throw normalizeSocialAuthError(error, "fastapi_identity_resolve");
  }
}

async function exchangeCodeForSession(code: string) {
  const { data, error } = await getSupabaseClient().auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    throw error ?? new Error("missing_social_session");
  }

  return data.session;
}

async function restoreSessionFromCallbackTokens(accessToken: string, refreshToken: string) {
  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw error ?? new Error("missing_social_session");
  }

  return data.session;
}

async function persistPendingAttempt(attempt: PendingSocialAttempt) {
  await AsyncStorage.setItem(pendingAttemptStorageKey, JSON.stringify(attempt));
}

async function readPendingAttempt(): Promise<PendingSocialAttempt | null> {
  const raw = await AsyncStorage.getItem(pendingAttemptStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const attempt = JSON.parse(raw) as PendingSocialAttempt;
    if (!attempt.expiresAt || Date.parse(attempt.expiresAt) <= Date.now()) {
      await clearPendingAttempt();
      return null;
    }
    return attempt;
  } catch {
    await clearPendingAttempt();
    return null;
  }
}

async function clearPendingAttempt() {
  await AsyncStorage.removeItem(pendingAttemptStorageKey);
}

function parseAuthParams(url?: string) {
  const values: Record<string, string | undefined> = {};

  if (!url) {
    return values;
  }

  try {
    const parsed = new URL(url);
    mergeParams(values, parsed.searchParams);
    mergeParams(values, new URLSearchParams(parsed.hash.replace(/^#/, "")));
  } catch {
    const [, rawQuery = ""] = url.split("?");
    const [query, rawHash = ""] = rawQuery.split("#");
    mergeParams(values, new URLSearchParams(query));
    mergeParams(values, new URLSearchParams(rawHash));
  }

  return values;
}

function mergeParams(target: Record<string, string | undefined>, params: URLSearchParams) {
  params.forEach((value, key) => {
    if (value) {
      target[key] = value;
    }
  });
}

function isProviderCancellation(params: Record<string, string | undefined>) {
  return params.error === "access_denied" || params.error_code === "access_denied";
}

function toSupabaseProvider(provider: SocialAuthProvider) {
  if (provider === "naver") {
    return "custom:naver" as `custom:${string}`;
  }

  return provider;
}

function toSafeReturnPath(value: unknown) {
  const nextValue = getSafeReturnTo(value);
  return typeof nextValue === "string" ? nextValue : null;
}

function getProviderScopes(provider: SocialAuthProvider) {
  switch (provider) {
    case "google":
      return "openid email profile";
    case "kakao":
      return undefined;
    case "naver":
      return "openid";
    case "apple":
      return undefined;
  }
}

function isAppleAuthorizationCancelled(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const value = error as { code?: unknown; message?: unknown };
  return value.code === "ERR_REQUEST_CANCELED" || value.message === "The user canceled the authorization attempt";
}

function normalizeSocialAuthError(error: unknown, phase: SocialPhase) {
  if (error instanceof UserFacingSocialAuthError) {
    return error;
  }

  if (error instanceof NetworkError) {
    return new UserFacingSocialAuthError("social_provider_unavailable", phase);
  }

  if (error instanceof ApiError) {
    const code = error.code;
    if (
      code === "social_provider_disabled" ||
      code === "social_provider_review_pending" ||
      code === "social_unsupported_platform" ||
      code === "social_state_mismatch" ||
      code === "social_email_missing" ||
      code === "social_identity_conflict" ||
      code === "social_identity_not_verified" ||
      code === "social_account_link_required" ||
      code === "social_account_inactive" ||
      code === "social_rejoin_blocked" ||
      code === "social_profile_sync_failed" ||
      code === "social_legal_consent_required" ||
      code === "social_attempt_replayed"
    ) {
      return new UserFacingSocialAuthError(code, phase, error.userMessage);
    }

    if (error.status >= 500) {
      return new UserFacingSocialAuthError("social_provider_unavailable", phase);
    }

    return new UserFacingSocialAuthError("social_unknown", phase, error.userMessage);
  }

  captureAppError(error, {
    code: "social_unknown",
    phase,
  });

  return new UserFacingSocialAuthError("social_unknown", phase);
}

function getSocialAuthMessageByCode(code: SocialAuthErrorCode) {
  switch (code) {
    case "social_provider_disabled":
      return "지금은 이 로그인 방법을 사용할 수 없어요.";
    case "social_provider_review_pending":
      return "이 로그인 방법은 아직 준비 중이에요.";
    case "social_unsupported_platform":
      return "이 기기에서는 사용할 수 없는 로그인 방법이에요.";
    case "social_authorization_cancelled":
      return "로그인을 취소했어요.";
    case "social_callback_expired":
      return "로그인 요청이 만료됐어요. 다시 시도해 주세요.";
    case "social_state_mismatch":
      return "로그인 후 이동할 화면을 확인하지 못했어요. 다시 시도해 주세요.";
    case "social_code_exchange_failed":
      return "로그인 확인을 마무리하지 못했어요. 다시 시도해 주세요.";
    case "social_provider_unavailable":
      return "로그인 서버 연결이 불안정해요. 잠시 후 다시 시도해 주세요.";
    case "social_email_missing":
      return "연락받을 이메일 확인이 필요한 계정이에요.";
    case "social_identity_conflict":
      return "다른 계정에 연결된 로그인 방법이에요. 기존 계정으로 로그인해 주세요.";
    case "social_identity_not_verified":
      return "로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.";
    case "social_account_link_required":
      return "같은 이메일의 Hypofit 계정이 있어요. 기존 계정으로 로그인한 뒤 연결해 주세요.";
    case "social_account_inactive":
      return "삭제되었거나 비활성화된 계정이에요. 다시 이용하려면 회원가입을 진행해 주세요.";
    case "social_rejoin_blocked":
      return "지금은 다시 가입할 수 없는 계정이에요.";
    case "social_profile_sync_failed":
      return "계정 확인은 됐지만 시작 준비를 마치지 못했어요. 다시 시도해 주세요.";
    case "social_legal_consent_required":
      return "서비스 이용을 계속하려면 가입 단계를 마무리해 주세요.";
    case "social_attempt_replayed":
      return "이미 처리된 로그인 요청이에요. 다시 시도해 주세요.";
    case "social_unknown":
      return "로그인을 이어가지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  if (!localPart || !domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 2);
  const masked = "*".repeat(Math.max(localPart.length - visibleStart.length, 1));
  return `${visibleStart}${masked}@${domain}`;
}
