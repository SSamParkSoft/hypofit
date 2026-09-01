import { DEFAULT_POST_AUTH_PATH, resolvePostAuthPath } from "../../authEntryState";

export const SOCIAL_AUTH_CALLBACK_PATH = "/auth/social/callback";

function toPathParts(candidate: string) {
  const parsed = new URL(candidate, "https://hypofit.local");
  return {
    hash: parsed.hash,
    pathname: parsed.pathname,
    search: parsed.search,
  };
}

export function buildSocialAuthCallbackUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URL(SOCIAL_AUTH_CALLBACK_PATH, window.location.origin).toString();
}

export function getApprovedSocialReturnTo() {
  if (typeof window === "undefined") {
    return DEFAULT_POST_AUTH_PATH;
  }

  if (
    window.location.pathname === DEFAULT_POST_AUTH_PATH &&
    new URLSearchParams(window.location.search).get("account") === "choose"
  ) {
    return DEFAULT_POST_AUTH_PATH;
  }

  return resolvePostAuthPath({
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  });
}

export function sanitizeSocialReturnTo(candidate: string | null | undefined) {
  if (!candidate) {
    return DEFAULT_POST_AUTH_PATH;
  }

  try {
    return resolvePostAuthPath(toPathParts(candidate));
  } catch {
    return DEFAULT_POST_AUTH_PATH;
  }
}

export function scrubSocialCallbackUrl() {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(window.history.state, "", SOCIAL_AUTH_CALLBACK_PATH);
}
