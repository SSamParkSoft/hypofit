import { apiRequest, type ApiRequestInit } from "../../../../shared/api/client";
import {
  getSocialProviderIdFromIdentifier,
  normalizeSocialProviderIdentifier,
  sortBySocialProviderOrder,
  type SocialProviderId,
  type SocialProviderIdentifier,
} from "../model/providerRegistry";
import type { SocialAuthEntryIntent } from "../lib/socialAuthStorage";

export interface SocialAuthAttempt {
  attemptId: string;
  attemptSecret: string;
  expiresAt: string;
  returnTo: string;
}

export interface SocialAuthCompleteResult {
  nextStep: string | null;
  returnTo: string | null;
}

export interface SocialAuthIdentity {
  email: string | null;
  emailVerified: boolean | null;
  linkedAt: string;
  provider: SocialProviderId;
  providerIdentifier: SocialProviderIdentifier;
  status: "active" | "revocation_pending" | "revoked";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "boolean" ? record[key] : null;
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" && record[key].trim() ? record[key] : null;
}

function normalizeIdentity(record: Record<string, unknown>): SocialAuthIdentity | null {
  const rawProvider = readString(record, "provider") ?? readString(record, "id");
  const provider = getSocialProviderIdFromIdentifier(rawProvider);
  const providerIdentifier = normalizeSocialProviderIdentifier(rawProvider);

  if (!provider || !providerIdentifier) {
    return null;
  }

  const linkedAt = readString(record, "linked_at") ?? new Date(0).toISOString();
  const rawStatus = readString(record, "status");

  return {
    email: readString(record, "email"),
    emailVerified: readBoolean(record, "email_verified"),
    linkedAt,
    provider,
    providerIdentifier,
    status:
      rawStatus === "revocation_pending" || rawStatus === "revoked" ? rawStatus : "active",
  };
}

export async function createSocialAuthAttempt(input: {
  intent: SocialAuthEntryIntent;
  provider: SocialProviderId;
  returnTo: string;
}) {
  const response = await apiRequest<unknown>("/api/v1/auth/social/attempts", {
    body: JSON.stringify({
      flow: "login",
      platform: "web",
      provider: input.provider,
      return_path: input.returnTo,
    }),
    method: "POST",
  });
  const record = asRecord(response);
  const attemptId = readString(record ?? {}, "attempt_id");
  const attemptSecret = readString(record ?? {}, "attempt_secret");
  const expiresAt = readString(record ?? {}, "expires_at");

  if (!attemptId || !attemptSecret || !expiresAt) {
    throw new Error("social_attempt_response_invalid");
  }

  return {
    attemptId,
    attemptSecret,
    expiresAt,
    returnTo:
      readString(record ?? {}, "return_to") ??
      readString(record ?? {}, "return_path") ??
      input.returnTo,
  } satisfies SocialAuthAttempt;
}

export async function createSocialAuthLinkAttempt(
  accessToken: string,
  input: {
    provider: SocialProviderId;
    returnTo: string;
  },
) {
  const response = await apiRequest<unknown>("/api/v1/auth/social/identities/link-attempts", {
    accessToken,
    body: JSON.stringify({
      platform: "web",
      provider: input.provider,
      return_path: input.returnTo,
    }),
    method: "POST",
  });
  const record = asRecord(response);
  const attemptId = readString(record ?? {}, "attempt_id");
  const attemptSecret = readString(record ?? {}, "attempt_secret");
  const expiresAt = readString(record ?? {}, "expires_at");

  if (!attemptId || !attemptSecret || !expiresAt) {
    throw new Error("social_attempt_response_invalid");
  }

  return {
    attemptId,
    attemptSecret,
    expiresAt,
    returnTo:
      readString(record ?? {}, "return_to") ??
      readString(record ?? {}, "return_path") ??
      input.returnTo,
  } satisfies SocialAuthAttempt;
}

export async function completeSocialAuth(
  accessToken: string,
  input: {
    attemptId: string;
    attemptSecret: string;
  },
) {
  const body: Record<string, unknown> = {
    attempt_id: input.attemptId,
    attempt_secret: input.attemptSecret,
  };

  const response = await apiRequest<unknown>("/api/v1/auth/social/complete", {
    accessToken,
    body: JSON.stringify(body),
    method: "POST",
  });
  const record = asRecord(response);

  return {
    nextStep: readString(record ?? {}, "next_step") ?? readString(record ?? {}, "status"),
    returnTo: readString(record ?? {}, "return_to") ?? readString(record ?? {}, "return_path"),
  } satisfies SocialAuthCompleteResult;
}

export async function getSocialAuthIdentities(
  accessToken: string,
  init?: Pick<ApiRequestInit, "signal">,
) {
  const response = await apiRequest<unknown>("/api/v1/auth/social/identities", {
    ...init,
    accessToken,
  });
  return normalizeIdentities(response);
}

export async function reconcileSocialAuthIdentities(
  accessToken: string,
  init?: Pick<ApiRequestInit, "signal">,
) {
  const response = await apiRequest<unknown>("/api/v1/auth/social/identities/reconcile", {
    ...init,
    accessToken,
    method: "POST",
  });

  return normalizeIdentities(response);
}

function normalizeIdentities(response: unknown) {
  const record = asRecord(response);
  const rawIdentities = record?.identities;

  if (!Array.isArray(rawIdentities)) {
    return [] satisfies SocialAuthIdentity[];
  }

  return sortBySocialProviderOrder(
    rawIdentities
      .map((item) => normalizeIdentity(asRecord(item) ?? {}))
      .filter((item): item is SocialAuthIdentity => Boolean(item)),
  );
}
