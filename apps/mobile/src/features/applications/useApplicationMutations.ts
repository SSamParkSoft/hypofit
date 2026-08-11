import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Application } from "@hypofit/contracts";
import {
  applicationsApi,
  type CreateApplicationInput,
  type UpdateApplicationStatusInput,
} from "@/shared/api/applications";

export function useCreateApplication(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applicationsApi.create(input, accessToken),
    onSuccess: (application) => {
      queryClient.setQueriesData<Application[]>({ queryKey: ["applications"] }, (current) => {
        if (!current) return current;

        const hasApplication = current.some((item) => item.id === application.id);
        if (hasApplication) {
          return current.map((item) => (item.id === application.id ? application : item));
        }

        return [application, ...current];
      });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useUpdateApplicationStatus(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      input,
    }: {
      applicationId: string;
      input: UpdateApplicationStatusInput;
    }) => applicationsApi.updateStatus(applicationId, input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-room"] });
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
