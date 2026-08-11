import { apiRequest, type ApiRequestInit } from "./client";
import type {
  CreateSupportTicketInput,
  SupportTicket,
  SupportTicketKind,
  UpdateSupportTicketInput,
} from "./types";

const supportTicketsPath = "/api/v1/support/tickets";

function buildSupportTicketQuery(kind?: SupportTicketKind) {
  if (!kind) {
    return "";
  }

  const search = new URLSearchParams({ kind });
  return `?${search.toString()}`;
}

function buildSupportTicketPath(ticketId: string) {
  return `${supportTicketsPath}/${encodeURIComponent(ticketId)}`;
}

export function createSupportTicket(
  input: CreateSupportTicketInput,
  accessToken?: string | null,
): Promise<SupportTicket> {
  return apiRequest<SupportTicket>(supportTicketsPath, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function listSupportTickets(
  accessToken?: string | null,
  kind?: SupportTicketKind,
  init?: ApiRequestInit,
): Promise<SupportTicket[]> {
  return apiRequest<SupportTicket[]>(`${supportTicketsPath}${buildSupportTicketQuery(kind)}`, {
    ...init,
    accessToken,
  });
}

export function updateSupportTicket(
  ticketId: string,
  input: UpdateSupportTicketInput,
  accessToken?: string | null,
): Promise<SupportTicket> {
  return apiRequest<SupportTicket>(buildSupportTicketPath(ticketId), {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteSupportTicket(ticketId: string, accessToken?: string | null): Promise<void> {
  return apiRequest<void>(buildSupportTicketPath(ticketId), {
    method: "DELETE",
    accessToken,
  });
}

export const supportApi = {
  createTicket: createSupportTicket,
  deleteTicket: deleteSupportTicket,
  listTickets: listSupportTickets,
  updateTicket: updateSupportTicket,
} as const;
