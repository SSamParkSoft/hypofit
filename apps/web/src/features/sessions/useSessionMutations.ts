import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sessionsApi, type MarkNoShowInput } from "../../shared/api/sessions";
import type { CreateSessionInput } from "../../shared/api/sessions";
import { resolveStableAuthUserId } from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";
import { sessionQueryKeys } from "./useSessions";

export function useCreateSession(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (input: CreateSessionInput) => sessionsApi.create(input, effectiveAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists(stableUserId) });
    },
  });
}

export function useCompleteSession(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.complete(sessionId, effectiveAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists(stableUserId) });
    },
  });
}

export function useMarkNoShow(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: ({ input, sessionId }: { input: MarkNoShowInput; sessionId: string }) =>
      sessionsApi.markNoShow(sessionId, input, effectiveAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists(stableUserId) });
    },
  });
}
