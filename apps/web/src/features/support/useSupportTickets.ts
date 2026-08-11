import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { supportApi } from "../../shared/api/support";
import {
  getProtectedQueryUserId,
  matchesProtectedQueryUser,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import type {
  CreateSupportTicketInput,
  SupportTicket,
  SupportTicketKind,
  UpdateSupportTicketInput,
} from "../../shared/api/types";
import { useAuth } from "../auth/useAuth";

export const supportTicketQueryKeys = {
  all: ["support-tickets"] as const,
  lists(userId: string | null) {
    return ["support-tickets", getProtectedQueryUserId(userId)] as const;
  },
  list(userId: string | null, kind?: SupportTicketKind) {
    return [
      "support-tickets",
      getProtectedQueryUserId(userId),
      kind ?? "all",
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

function isSupportTicketKind(value: unknown): value is SupportTicketKind {
  return (
    value === "account_deletion" ||
    value === "inquiry" ||
    value === "privacy" ||
    value === "report"
  );
}

function getSupportQueryUserId(queryKey: readonly unknown[]) {
  const userId = queryKey[1];
  return typeof userId === "string" ? userId : null;
}

function getSupportQueryKind(queryKey: readonly unknown[]) {
  const kind = queryKey[2];
  if (kind === "all" || isSupportTicketKind(kind)) {
    return kind;
  }

  return null;
}

function sortSupportTickets(tickets: SupportTicket[]) {
  return [...tickets].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function upsertSupportTicket(current: SupportTicket[], ticket: SupportTicket) {
  const hasTicket = current.some((item) => item.id === ticket.id);
  const nextTickets = hasTicket
    ? current.map((item) => (item.id === ticket.id ? ticket : item))
    : [ticket, ...current];

  return sortSupportTickets(nextTickets);
}

function writeSupportTicketToCache(
  queryClient: QueryClient,
  stableUserId: string | null,
  ticket: SupportTicket,
) {
  for (const [queryKey, current] of queryClient.getQueriesData<SupportTicket[]>({
    queryKey: supportTicketQueryKeys.all,
  })) {
    if (!Array.isArray(current)) {
      continue;
    }

    if (!matchesProtectedQueryUser(getSupportQueryUserId(queryKey), stableUserId)) {
      continue;
    }

    const queryKind = getSupportQueryKind(queryKey);
    if (queryKind !== "all" && queryKind !== ticket.kind) {
      queryClient.setQueryData<SupportTicket[]>(
        queryKey,
        current.filter((item) => item.id !== ticket.id),
      );
      continue;
    }

    queryClient.setQueryData<SupportTicket[]>(queryKey, upsertSupportTicket(current, ticket));
  }
}

function removeSupportTicketFromCache(
  queryClient: QueryClient,
  stableUserId: string | null,
  ticketId: string,
) {
  for (const [queryKey, current] of queryClient.getQueriesData<SupportTicket[]>({
    queryKey: supportTicketQueryKeys.all,
  })) {
    if (!Array.isArray(current)) {
      continue;
    }

    if (!matchesProtectedQueryUser(getSupportQueryUserId(queryKey), stableUserId)) {
      continue;
    }

    queryClient.setQueryData<SupportTicket[]>(
      queryKey,
      current.filter((item) => item.id !== ticketId),
    );
  }
}

export function useSupportTickets(
  accessToken?: string | null,
  kind: SupportTicketKind | null = "inquiry",
) {
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) =>
      supportApi.listTickets(effectiveAccessToken, kind ?? undefined, { signal }),
    queryKey: supportTicketQueryKeys.list(stableUserId, kind ?? undefined),
    staleTime: 15_000,
  });
}

export function useCreateSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) =>
      supportApi.createTicket(input, effectiveAccessToken),
    onSuccess: (ticket) => {
      writeSupportTicketToCache(queryClient, stableUserId, ticket);
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.lists(stableUserId) });
    },
  });
}

export function useUpdateSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useMutation({
    mutationFn: ({ input, ticketId }: { input: UpdateSupportTicketInput; ticketId: string }) =>
      supportApi.updateTicket(ticketId, input, effectiveAccessToken),
    onSuccess: (ticket) => {
      writeSupportTicketToCache(queryClient, stableUserId, ticket);
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.lists(stableUserId) });
    },
  });
}

export function useDeleteSupportTicket(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { accessToken: authAccessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);
  const effectiveAccessToken = accessToken ?? authAccessToken;

  return useMutation({
    mutationFn: (ticketId: string) => supportApi.deleteTicket(ticketId, effectiveAccessToken),
    onSuccess: (_result, ticketId) => {
      removeSupportTicketFromCache(queryClient, stableUserId, ticketId);
      void queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.lists(stableUserId) });
    },
  });
}
