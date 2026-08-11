import type { Query, QueryClient } from "@tanstack/react-query";

const AUTH_QUERY_SCOPE = "api";
const PUBLIC_QUERY_SCOPE = "public";
const UNKNOWN_AUTH_USER_ID = "unknown-user";

export function resolveAuthUserId(
  appUserId?: string | null,
  sessionUserId?: string | null,
) {
  return sessionUserId ?? appUserId ?? null;
}

export function buildAuthQueryKey<Resource extends string>(
  resource: Resource,
  userId: string | null,
  ...parts: ReadonlyArray<unknown>
) {
  return [resource, userId ?? UNKNOWN_AUTH_USER_ID, ...parts, AUTH_QUERY_SCOPE] as const;
}

export function buildPublicQueryKey<Resource extends string>(
  resource: Resource,
  ...parts: ReadonlyArray<unknown>
) {
  return [resource, ...parts, PUBLIC_QUERY_SCOPE] as const;
}

export function isAuthScopedQuery(query: Query) {
  const lastKey = query.queryKey[query.queryKey.length - 1];
  return lastKey === AUTH_QUERY_SCOPE;
}

export async function clearAuthScopedQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ predicate: isAuthScopedQuery });
  queryClient.removeQueries({ predicate: isAuthScopedQuery });
}
