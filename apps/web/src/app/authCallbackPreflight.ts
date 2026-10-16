import { SOCIAL_AUTH_STORAGE_KEY } from "../features/auth/social/lib/socialAuthStorage";

// This module must run before Supabase's automatic URL session detection.
if (typeof window !== "undefined" && window.location.pathname === "/auth/social/callback") {
  try {
    const raw = window.sessionStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
    const attempt = raw ? JSON.parse(raw) : null;
    if (attempt?.provider === "naver" || attempt?.providerIdentifier === "custom:naver") {
      window.history.replaceState(window.history.state, "", "/auth/social/callback");
      window.sessionStorage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
    }
  } catch {
    // Leave unrelated or unreadable attempts to the existing callback handling.
  }
}
