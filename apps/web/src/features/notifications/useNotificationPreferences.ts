import type {
  NotificationPreference,
  NotificationPreferenceUpdate,
} from "@hypofit/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pushApi } from "../../shared/api/push";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import { useAuth } from "../auth/useAuth";

export const notificationPreferenceQueryKeys = {
  all: ["notification-preferences"] as const,
  detail(stableUserId: string | null) {
    return [
      "notification-preferences",
      getProtectedQueryUserId(stableUserId),
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

export function useNotificationPreferences(accessToken?: string | null) {
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) => pushApi.getPreferences(effectiveAccessToken, { signal }),
    queryKey: notificationPreferenceQueryKeys.detail(stableUserId),
    staleTime: 30_000,
  });
}

export function useUpdateNotificationPreferences(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useMutation({
    mutationFn: (input: NotificationPreferenceUpdate) =>
      pushApi.updatePreferences(input, effectiveAccessToken),
    onSuccess: (preference: NotificationPreference) => {
      queryClient.setQueryData(
        notificationPreferenceQueryKeys.detail(stableUserId),
        preference,
      );
    },
  });
}
