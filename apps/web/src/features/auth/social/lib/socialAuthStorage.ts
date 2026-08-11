import type { SocialProviderId, SocialProviderIdentifier } from "../model/providerRegistry";

export type SocialAuthEntryIntent = "link" | "sign_in" | "sign_up";

export interface StoredSocialAuthAttempt {
  approvedReturnTo: string;
  attemptId: string;
  attemptSecret: string;
  completionStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  intent: SocialAuthEntryIntent;
  navigationTarget: string | null;
  provider: SocialProviderId;
  providerIdentifier: SocialProviderIdentifier;
}

export const SOCIAL_AUTH_STORAGE_KEY = "hypofit.social-auth.pending-attempt";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function clearStoredSocialAuthAttempt() {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
}

export function readStoredSocialAuthAttempt(): StoredSocialAuthAttempt | null {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(SOCIAL_AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSocialAuthAttempt>;
    if (
      typeof parsed.attemptId !== "string" ||
      typeof parsed.approvedReturnTo !== "string" ||
      typeof parsed.attemptSecret !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.intent !== "string" ||
      typeof parsed.provider !== "string" ||
      typeof parsed.providerIdentifier !== "string"
    ) {
      clearStoredSocialAuthAttempt();
      return null;
    }

    if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) {
      clearStoredSocialAuthAttempt();
      return null;
    }

    return {
      approvedReturnTo: parsed.approvedReturnTo,
      attemptId: parsed.attemptId,
      attemptSecret: parsed.attemptSecret,
      completionStartedAt:
        typeof parsed.completionStartedAt === "string" ? parsed.completionStartedAt : null,
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
      createdAt: parsed.createdAt,
      expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : null,
      intent:
        parsed.intent === "link"
          ? "link"
          : parsed.intent === "sign_up"
            ? "sign_up"
            : "sign_in",
      navigationTarget:
        typeof parsed.navigationTarget === "string" ? parsed.navigationTarget : null,
      provider: parsed.provider as StoredSocialAuthAttempt["provider"],
      providerIdentifier:
        parsed.providerIdentifier as StoredSocialAuthAttempt["providerIdentifier"],
    };
  } catch {
    clearStoredSocialAuthAttempt();
    return null;
  }
}

export function writeStoredSocialAuthAttempt(attempt: StoredSocialAuthAttempt) {
  const storage = getSessionStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(SOCIAL_AUTH_STORAGE_KEY, JSON.stringify(attempt));
    return true;
  } catch {
    return false;
  }
}

export function markStoredSocialAuthCompletionStarted(startedAt = new Date().toISOString()) {
  const currentAttempt = readStoredSocialAuthAttempt();
  if (!currentAttempt) {
    return null;
  }

  const nextAttempt = {
    ...currentAttempt,
    completionStartedAt: startedAt,
  };

  writeStoredSocialAuthAttempt(nextAttempt);
  return nextAttempt;
}

export function markStoredSocialAuthCompleted(navigationTarget: string) {
  const currentAttempt = readStoredSocialAuthAttempt();
  if (!currentAttempt) {
    return null;
  }

  const nextAttempt = {
    ...currentAttempt,
    completedAt: new Date().toISOString(),
    navigationTarget,
  };

  writeStoredSocialAuthAttempt(nextAttempt);
  return nextAttempt;
}
