import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSupportTicketInput, SupportTicketKind, UpdateSupportTicketInput } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { supportApi } from "@/shared/api/support";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const supportTicketQueryKeys = {
  all: ["support-tickets"] as const,
  list(userId: string | null, kind?: SupportTicketKind) {
    return buildAuthQueryKey("support-tickets", userId, kind ?? "all");
  },
} as const;

export function useSupportTickets(accessToken?: string | null, kind?: SupportTicketKind) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    queryKey: supportTicketQueryKeys.list(stableUserId, kind),
    queryFn: () => supportApi.listTickets(accessToken, kind),
    enabled: Boolean(accessToken && stableUserId),
  });
}

export function useCreateSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => supportApi.createTicket(input, accessToken),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.all });
    },
  });
}

export function useUpdateSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, ticketId }: { input: UpdateSupportTicketInput; ticketId: string }) =>
      supportApi.updateTicket(ticketId, input, accessToken),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.all });
    },
  });
}

export function useDeleteSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => supportApi.deleteTicket(ticketId, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.all });
    },
  });
}
