import type { CreateSupportTicketInput, SupportTicket, UpdateSupportTicketInput } from "@hypofit/contracts";
import { apiRequest } from "./client";

const supportTicketsPath = "/api/v1/support/tickets";

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
  kind?: SupportTicket["kind"],
): Promise<SupportTicket[]> {
  const search = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return apiRequest<SupportTicket[]>(`${supportTicketsPath}${search}`, {
    accessToken,
  });
}

export function updateSupportTicket(
  ticketId: string,
  input: UpdateSupportTicketInput,
  accessToken?: string | null,
): Promise<SupportTicket> {
  return apiRequest<SupportTicket>(`${supportTicketsPath}/${ticketId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteSupportTicket(ticketId: string, accessToken?: string | null): Promise<void> {
  return apiRequest<void>(`${supportTicketsPath}/${ticketId}`, {
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
