import { QueryClient, type QueryKey } from "@tanstack/react-query";

import { isRetryableApiError } from "./client";
import { getProtectedQueryUserId } from "./queryAuth";

const MAX_QUERY_RETRIES = 2;
const MAX_QUERY_RETRY_DELAY_MS = 4_000;

export const protectedQueryKeyRoots = [
  "applications",
  "chat-messages",
  "chat-rooms",
  "interview-post-views",
  "notifications",
  "sessions",
  "social-identities",
  "support-tickets",
] as const;

const protectedQueryKeyRootSet = new Set<string>(protectedQueryKeyRoots);

export function apiQueryRetryDelay(attemptIndex: number) {
  return Math.min(1_000 * 2 ** attemptIndex, MAX_QUERY_RETRY_DELAY_MS);
}

export function isProtectedQueryKey(queryKey: QueryKey) {
  const [root] = queryKey;
  return typeof root === "string" && protectedQueryKeyRootSet.has(root);
}

export function shouldRetryApiQuery(failureCount: number, error: unknown) {
  if (failureCount >= MAX_QUERY_RETRIES) {
    return false;
  }

  return isRetryableApiError(error);
}

export function clearProtectedQueryCache(
  queryClient: QueryClient,
  stableUserId?: string | null,
) {
  const scopedUserId =
    stableUserId === undefined ? null : getProtectedQueryUserId(stableUserId);

  queryClient.removeQueries({
    predicate: (query) => {
      if (!isProtectedQueryKey(query.queryKey)) {
        return false;
      }

      if (scopedUserId === null) {
        return true;
      }

      return query.queryKey[1] === scopedUserId;
    },
  });
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: shouldRetryApiQuery,
        retryDelay: apiQueryRetryDelay,
      },
    },
  });
}
