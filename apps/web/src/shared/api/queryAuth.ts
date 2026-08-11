export const PROTECTED_QUERY_SCOPE = "api";
export const UNKNOWN_AUTH_USER_ID = "unknown-user";

export function getProtectedQueryUserId(stableUserId: string | null | undefined) {
  return stableUserId ?? UNKNOWN_AUTH_USER_ID;
}

export function matchesProtectedQueryUser(
  queryUserId: unknown,
  stableUserId: string | null,
) {
  return queryUserId === getProtectedQueryUserId(stableUserId);
}

export function resolveStableAuthUserId(
  appUserId?: string | null,
  sessionUserId?: string | null,
) {
  return sessionUserId ?? appUserId ?? null;
}
