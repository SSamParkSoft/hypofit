import {
  getSocialProviderIdFromIdentifier,
  type SocialProviderId,
} from "../model/providerRegistry";

export const LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY =
  "hypofit.social-auth.last-used-provider";

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLastUsedSocialProvider(): SocialProviderId | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  return getSocialProviderIdFromIdentifier(
    storage.getItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY),
  );
}

export function writeLastUsedSocialProvider(provider: SocialProviderId) {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(LAST_USED_SOCIAL_PROVIDER_STORAGE_KEY, provider);
    return true;
  } catch {
    return false;
  }
}
