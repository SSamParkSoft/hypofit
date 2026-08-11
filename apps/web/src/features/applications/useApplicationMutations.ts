import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applicationsApi,
  type CreateApplicationInput,
  type UpdateApplicationStatusInput,
} from "../../shared/api/applications";
import { resolveStableAuthUserId } from "../../shared/api/queryAuth";
import type { Application } from "../../shared/api/types";
import { AuthContext } from "../auth/AuthProvider";
import { chatQueryKeys } from "../chat/useChatRooms";
import { sessionQueryKeys } from "../sessions/useSessions";
import { applicationQueryKeys } from "./useApplications";

export function useCreateApplication(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applicationsApi.create(input, effectiveAccessToken),
    onSuccess: (application) => {
      queryClient.setQueriesData<Application[]>(
        { queryKey: applicationQueryKeys.lists(stableUserId) },
        (current) => {
          if (!current) {
            return current;
          }

          const hasApplication = current.some((item) => item.id === application.id);
          if (hasApplication) {
            return current.map((item) => (item.id === application.id ? application : item));
          }

          return [application, ...current];
        },
      );
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.lists(stableUserId) });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.lists(stableUserId) });
    },
  });
}

export function useUpdateApplicationStatus(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: ({
      applicationId,
      input,
    }: {
      applicationId: string;
      input: UpdateApplicationStatusInput;
    }) => applicationsApi.updateStatus(applicationId, input, effectiveAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.lists(stableUserId) });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.lists(stableUserId) });
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists(stableUserId) });
    },
  });
}
